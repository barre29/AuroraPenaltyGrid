// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { EthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Aurora Penalty Grid
 * @notice Fully permissionless shootout prediction pool. Players pick Goal/Save for several kicks,
 *         stake encrypted weights, and anyone can trigger settlement from on-chain randomness.
 *         No admin, creator, or organizer privileges. Fully decentralized.
 */
contract AuroraPenaltyGrid is EthereumConfig {
    enum Outcome {
        Goal,
        Save
    }

    struct Kick {
        string label;
        euint64 goalExposure;
        euint64 saveExposure;
        uint256 picksGoal;
        uint256 picksSave;
    }

    struct Shootout {
        bool exists;
        string shootoutId;
        uint256 entryFee;
        uint256 lockTime;
        uint256 prizePool;
        bool cancelled;
        bool settled;
        bool pushAll;
        uint256 winnerCount;
        Kick[] kicks;
        uint8[] finalResults;
        address[] players;
    }

    struct Entry {
        bool exists;
        bool claimed;
        uint8[] picks;
        euint64 weightCipher;
    }

    mapping(string => Shootout) private shootouts;
    mapping(string => mapping(address => Entry)) private entries;
    string[] private shootoutIds;

    uint256 public constant MIN_ENTRY_FEE = 0.0005 ether;
    uint256 public constant MIN_DURATION = 10 minutes;
    uint256 public constant MAX_DURATION = 10 days;
    uint8 public constant MIN_KICKS = 3;
    uint8 public constant MAX_KICKS = 12;

    event ShootoutCreated(string indexed shootoutId, address indexed creator, uint8 kickCount, uint256 lockTime);
    event EntrySubmitted(string indexed shootoutId, address indexed player);
    event EntryAdjusted(string indexed shootoutId, address indexed player);
    event ShootoutSettled(string indexed shootoutId, bool pushAll, uint256 winnerCount);
    event ShootoutCancelled(string indexed shootoutId);
    event PrizeClaimed(string indexed shootoutId, address indexed player, uint256 amount);
    event RefundClaimed(string indexed shootoutId, address indexed player, uint256 amount);

    error ShootoutExists();
    error ShootoutMissing();
    error InvalidKicks();
    error InvalidFee();
    error InvalidDuration();
    error InvalidPick();
    error AlreadyEntered();
    error EntryNotFound();
    error Locked();
    error NotSettled();
    error NotWinner();
    error AlreadyClaimed();
    error NotRefundable();
    error AlreadySettled();

    /** ------------------------------ Creation ------------------------------ */

    function createReplicaShootout(
        string memory shootoutId,
        uint256 entryFee,
        uint256 duration,
        string[] memory kickLabels
    ) external {
        if (shootouts[shootoutId].exists) revert ShootoutExists();
        if (entryFee < MIN_ENTRY_FEE) revert InvalidFee();
        if (duration < MIN_DURATION || duration > MAX_DURATION) revert InvalidDuration();
        if (kickLabels.length < MIN_KICKS || kickLabels.length > MAX_KICKS) revert InvalidKicks();

        Shootout storage s = shootouts[shootoutId];
        s.exists = true;
        s.shootoutId = shootoutId;
        s.entryFee = entryFee;
        s.lockTime = block.timestamp + duration;

        for (uint256 i = 0; i < kickLabels.length; i++) {
            Kick storage k = s.kicks.push();
            k.label = kickLabels[i];
            // FHE encrypted fields (goalExposure, saveExposure) will be initialized on first entry
            // No FHE operations needed during shootout creation - keeps it lightweight
        }

        shootoutIds.push(shootoutId);
        emit ShootoutCreated(shootoutId, msg.sender, uint8(kickLabels.length), s.lockTime);
    }

    /** ----------------------------- Participation ----------------------------- */

    function enterReplicaShootout(
        string memory shootoutId,
        uint8[] calldata picks,
        externalEuint64 encryptedWeight,
        bytes calldata proof
    ) external payable {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (s.cancelled) revert Locked();
        if (block.timestamp >= s.lockTime) revert Locked();
        if (picks.length != s.kicks.length) revert InvalidPick();
        if (msg.value != s.entryFee) revert InvalidFee();

        Entry storage entry = entries[shootoutId][msg.sender];
        if (entry.exists) revert AlreadyEntered();

        euint64 weight = FHE.fromExternal(encryptedWeight, proof);
        _applyExposure(s, picks, weight, true);

        entry.exists = true;
        entry.claimed = false;
        entry.weightCipher = weight;
        _copyPicks(entry, picks);
        FHE.allow(weight, msg.sender);

        s.prizePool += msg.value;
        s.players.push(msg.sender);

        emit EntrySubmitted(shootoutId, msg.sender);
    }

    function adjustReplicaEntry(
        string memory shootoutId,
        uint8[] calldata newPicks,
        externalEuint64 newEncryptedWeight,
        bytes calldata proof
    ) external {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (s.cancelled) revert Locked();
        if (block.timestamp >= s.lockTime) revert Locked();
        if (newPicks.length != s.kicks.length) revert InvalidPick();

        Entry storage entry = entries[shootoutId][msg.sender];
        if (!entry.exists) revert EntryNotFound();

        _applyExposure(s, entry.picks, entry.weightCipher, false);

        euint64 newWeight = FHE.fromExternal(newEncryptedWeight, proof);
        _applyExposure(s, newPicks, newWeight, true);

        entry.weightCipher = newWeight;
        _copyPicks(entry, newPicks);
        entry.claimed = false;
        FHE.allow(newWeight, msg.sender);

        emit EntryAdjusted(shootoutId, msg.sender);
    }

    /** ----------------------------- Settlement ----------------------------- */

    /**
     * @notice Anyone can settle a shootout after lockTime. Uses blockhash for randomness.
     * @dev Fully permissionless - no creator or admin restrictions.
     */
    function settleReplicaShootout(string memory shootoutId) external {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (s.cancelled) revert Locked();
        if (block.timestamp < s.lockTime) revert Locked();
        if (s.settled) revert AlreadySettled();

        uint8[] memory outcomes = new uint8[](s.kicks.length);
        for (uint256 i = 0; i < s.kicks.length; i++) {
            bytes32 r = keccak256(abi.encode(blockhash(block.number - 1), shootoutId, i));
            outcomes[i] = uint8(uint256(r) % 2); // 0 = Goal, 1 = Save
        }

        s.finalResults = outcomes;

        uint256 winners = 0;
        for (uint256 i = 0; i < s.players.length; i++) {
            if (_isWinningEntry(entries[shootoutId][s.players[i]], outcomes)) {
                winners += 1;
            }
        }

        s.winnerCount = winners;
        s.pushAll = (winners == 0);
        s.settled = true;

        emit ShootoutSettled(shootoutId, s.pushAll, winners);
    }

    /**
     * @notice Anyone can cancel a shootout before lockTime if no entries exist.
     * @dev Fully permissionless - no creator restrictions.
     */
    function cancelReplicaShootout(string memory shootoutId) external {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (s.settled) revert AlreadySettled();
        if (s.players.length > 0) revert Locked(); // Cannot cancel if players already entered
        if (block.timestamp >= s.lockTime) revert Locked(); // Can only cancel before lock

        s.cancelled = true;
        emit ShootoutCancelled(shootoutId);
    }

    /** ----------------------------- Claims ----------------------------- */

    function claimReplicaPrize(string memory shootoutId) external {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (!s.settled || s.cancelled || s.pushAll) revert NotSettled();

        Entry storage entry = entries[shootoutId][msg.sender];
        if (!entry.exists) revert NotWinner();
        if (entry.claimed) revert AlreadyClaimed();
        if (!_isWinningEntry(entry, s.finalResults)) revert NotWinner();

        uint256 winners = s.winnerCount;
        require(winners > 0, "No winners");
        uint256 payout = s.prizePool / winners;

        entry.claimed = true;
        (bool sent, ) = payable(msg.sender).call{ value: payout }("");
        require(sent, "transfer failed");

        emit PrizeClaimed(shootoutId, msg.sender, payout);
    }

    function claimReplicaRefund(string memory shootoutId) external {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();

        Entry storage entry = entries[shootoutId][msg.sender];
        if (!entry.exists) revert NotRefundable();
        if (entry.claimed) revert AlreadyClaimed();

        bool refundable = s.cancelled || (s.settled && s.pushAll);
        if (!refundable) revert NotRefundable();

        entry.claimed = true;
        (bool sent, ) = payable(msg.sender).call{ value: s.entryFee }("");
        require(sent, "refund failed");

        emit RefundClaimed(shootoutId, msg.sender, s.entryFee);
    }

    /** ----------------------------- Views ----------------------------- */

    function listReplicaShootouts() external view returns (string[] memory) {
        return shootoutIds;
    }

    function getReplicaShootout(string memory shootoutId)
        external
        view
        returns (
            uint256 entryFee,
            uint256 lockTime,
            uint256 prizePool,
            bool cancelled,
            bool settled,
            bool pushAll,
            uint256 winnerCount
        )
    {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        return (
            s.entryFee,
            s.lockTime,
            s.prizePool,
            s.cancelled,
            s.settled,
            s.pushAll,
            s.winnerCount
        );
    }

    function getReplicaKicks(string memory shootoutId)
        external
        view
        returns (
            string[] memory labels,
            uint256[] memory picksGoal,
            uint256[] memory picksSave
        )
    {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();

        uint256 len = s.kicks.length;
        labels = new string[](len);
        picksGoal = new uint256[](len);
        picksSave = new uint256[](len);

        for (uint256 i = 0; i < len; i++) {
            labels[i] = s.kicks[i].label;
            picksGoal[i] = s.kicks[i].picksGoal;
            picksSave[i] = s.kicks[i].picksSave;
        }

        return (labels, picksGoal, picksSave);
    }

    function getReplicaEntry(string memory shootoutId, address user)
        external
        view
        returns (
            bool exists,
            bool claimed,
            uint8[] memory picks
        )
    {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        Entry storage entry = entries[shootoutId][user];

        uint8[] memory picksSnapshot = new uint8[](entry.picks.length);
        for (uint256 i = 0; i < entry.picks.length; i++) {
            picksSnapshot[i] = entry.picks[i];
        }

        return (entry.exists, entry.claimed, picksSnapshot);
    }

    function getReplicaEntryWeight(string memory shootoutId, address user)
        external
        view
        returns (bytes32)
    {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        Entry storage entry = entries[shootoutId][user];
        if (!entry.exists) revert EntryNotFound();

        return FHE.toBytes32(entry.weightCipher);
    }

    function getShootoutPlayers(string memory shootoutId) external view returns (address[] memory) {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        return s.players;
    }

    function getShootoutResults(string memory shootoutId) external view returns (uint8[] memory) {
        Shootout storage s = shootouts[shootoutId];
        if (!s.exists) revert ShootoutMissing();
        if (!s.settled) revert NotSettled();
        return s.finalResults;
    }

    function getUserShootouts(address user) external view returns (string[] memory) {
        uint256 count = 0;
        for (uint256 i = 0; i < shootoutIds.length; i++) {
            if (entries[shootoutIds[i]][user].exists) {
                count++;
            }
        }

        string[] memory userShootouts = new string[](count);
        uint256 index = 0;
        for (uint256 i = 0; i < shootoutIds.length; i++) {
            if (entries[shootoutIds[i]][user].exists) {
                userShootouts[index] = shootoutIds[i];
                index++;
            }
        }

        return userShootouts;
    }

    /** ----------------------------- Helpers ----------------------------- */

    function _applyExposure(
        Shootout storage s,
        uint8[] memory picks,
        euint64 weight,
        bool add
    ) internal {
        for (uint256 i = 0; i < picks.length; i++) {
            uint8 pick = picks[i];
            Kick storage k = s.kicks[i];
            if (pick == uint8(Outcome.Goal)) {
                // Initialize goalExposure if it's the first time
                if (k.picksGoal == 0 && add) {
                    k.goalExposure = weight;
                } else {
                    k.goalExposure = add ? FHE.add(k.goalExposure, weight) : FHE.sub(k.goalExposure, weight);
                }
                k.picksGoal = add ? k.picksGoal + 1 : k.picksGoal - 1;
                FHE.allowThis(k.goalExposure);
            } else if (pick == uint8(Outcome.Save)) {
                // Initialize saveExposure if it's the first time
                if (k.picksSave == 0 && add) {
                    k.saveExposure = weight;
                } else {
                    k.saveExposure = add ? FHE.add(k.saveExposure, weight) : FHE.sub(k.saveExposure, weight);
                }
                k.picksSave = add ? k.picksSave + 1 : k.picksSave - 1;
                FHE.allowThis(k.saveExposure);
            } else {
                revert InvalidPick();
            }
        }
    }

    function _copyPicks(Entry storage entry, uint8[] memory picks) internal {
        delete entry.picks;
        for (uint256 i = 0; i < picks.length; i++) {
            entry.picks.push(picks[i]);
        }
    }

    function _isWinningEntry(Entry storage entry, uint8[] memory results) internal view returns (bool) {
        if (!entry.exists) return false;
        if (entry.picks.length != results.length) return false;
        for (uint256 i = 0; i < results.length; i++) {
            if (entry.picks[i] != results[i]) {
                return false;
            }
        }
        return true;
    }
}
