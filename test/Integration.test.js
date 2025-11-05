const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuroraPenaltyGrid - Integration Tests", function () {
  let contract;
  let owner, player1, player2, player3, player4, player5;
  const ENTRY_FEE = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, player1, player2, player3, player4, player5] = await ethers.getSigners();

    const AuroraPenaltyGrid = await ethers.getContractFactory("AuroraPenaltyGrid");
    contract = await AuroraPenaltyGrid.deploy();
    await contract.waitForDeployment();
  });

  describe("End-to-End Shootout Flow", function () {
    it("Should complete full shootout lifecycle", async function () {
      // Step 1: Create shootout
      const shootoutId = "e2e-shootout";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      // Verify creation
      const shootouts = await contract.listReplicaShootouts();
      expect(shootouts).to.include(shootoutId);

      // Step 2: Multiple players enter
      const picks = [0, 1, 0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player2).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player3).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );

      // Verify entries
      const entry1 = await contract.getReplicaEntry(shootoutId, player1.address);
      const entry2 = await contract.getReplicaEntry(shootoutId, player2.address);
      const entry3 = await contract.getReplicaEntry(shootoutId, player3.address);

      expect(entry1[0]).to.equal(true);
      expect(entry2[0]).to.equal(true);
      expect(entry3[0]).to.equal(true);

      // Step 3: Verify prize pool
      const shootout = await contract.getReplicaShootout(shootoutId);
      const expectedPool = ENTRY_FEE * 3n;
      expect(shootout[2]).to.equal(expectedPool);
    });
  });

  describe("Multiple Shootouts Management", function () {
    it("Should handle multiple concurrent shootouts", async function () {
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      // Create multiple shootouts
      await contract.createReplicaShootout("shootout-1", ENTRY_FEE, duration, kickLabels);
      await contract.createReplicaShootout("shootout-2", ethers.parseEther("0.002"), duration, kickLabels);
      await contract.createReplicaShootout("shootout-3", ethers.parseEther("0.005"), duration, kickLabels);

      const shootouts = await contract.listReplicaShootouts();
      expect(shootouts.length).to.equal(3);

      // Players can participate in different shootouts
      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        "shootout-1", picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player1).enterReplicaShootout(
        "shootout-2", picks, encryptedWeight, proof, { value: ethers.parseEther("0.002") }
      );

      const entry1 = await contract.getReplicaEntry("shootout-1", player1.address);
      const entry2 = await contract.getReplicaEntry("shootout-2", player1.address);

      expect(entry1[0]).to.equal(true);
      expect(entry2[0]).to.equal(true);
    });
  });

  describe("Complex Pick Patterns", function () {
    const shootoutId = "complex-picks";
    const kickLabels = ["K1", "K2", "K3", "K4", "K5", "K6", "K7"];

    beforeEach(async function () {
      await contract.createReplicaShootout(
        shootoutId,
        ENTRY_FEE,
        7 * 24 * 60 * 60,
        kickLabels
      );
    });

    it("Should accept all-goal predictions", async function () {
      const picks = [0, 0, 0, 0, 0, 0, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
        )
      ).to.not.be.reverted;

      const entry = await contract.getReplicaEntry(shootoutId, player1.address);
      expect(entry[2].every(pick => pick === 0n)).to.be.true;
    });

    it("Should accept all-save predictions", async function () {
      const picks = [1, 1, 1, 1, 1, 1, 1];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
        )
      ).to.not.be.reverted;

      const entry = await contract.getReplicaEntry(shootoutId, player1.address);
      expect(entry[2].every(pick => pick === 1n)).to.be.true;
    });

    it("Should accept mixed predictions", async function () {
      const picks = [0, 1, 1, 0, 1, 0, 1];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
        )
      ).to.not.be.reverted;

      const entry = await contract.getReplicaEntry(shootoutId, player1.address);
      expect(entry[2][0]).to.equal(0n);
      expect(entry[2][1]).to.equal(1n);
      expect(entry[2][6]).to.equal(1n);
    });
  });

  describe("Scale Testing", function () {
    it("Should handle many participants in one shootout", async function () {
      const shootoutId = "scale-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      // Five players enter
      const players = [player1, player2, player3, player4, player5];

      for (const player of players) {
        await contract.connect(player).enterReplicaShootout(
          shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
        );
      }

      // Verify all entries
      for (const player of players) {
        const entry = await contract.getReplicaEntry(shootoutId, player.address);
        expect(entry[0]).to.equal(true);
      }

      // Verify prize pool
      const shootout = await contract.getReplicaShootout(shootoutId);
      const expectedPool = ENTRY_FEE * BigInt(players.length);
      expect(shootout[2]).to.equal(expectedPool);
    });

    it("Should handle maximum kicks (12)", async function () {
      const shootoutId = "max-kicks";
      const kickLabels = Array.from({ length: 12 }, (_, i) => `Kick ${i + 1}`);
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const picks = Array.from({ length: 12 }, (_, i) => i % 2);
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );

      const kicks = await contract.getReplicaKicks(shootoutId);
      expect(kicks[0].length).to.equal(12);

      const entry = await contract.getReplicaEntry(shootoutId, player1.address);
      expect(entry[2].length).to.equal(12);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle minimum entry fee", async function () {
      const shootoutId = "min-fee";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;
      const minFee = ethers.parseEther("0.0005");

      await contract.createReplicaShootout(shootoutId, minFee, duration, kickLabels);

      const shootout = await contract.getReplicaShootout(shootoutId);
      expect(shootout[0]).to.equal(minFee);
    });

    it("Should handle minimum duration (1 day)", async function () {
      const shootoutId = "min-duration";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const minDuration = 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, minDuration, kickLabels);

      const shootout = await contract.getReplicaShootout(shootoutId);
      const lockTime = Number(shootout[1]);
      const now = Math.floor(Date.now() / 1000);

      expect(lockTime).to.be.closeTo(now + minDuration, 10); // Within 10 seconds
    });

    it("Should handle maximum duration (10 days)", async function () {
      const shootoutId = "max-duration";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const maxDuration = 10 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, maxDuration, kickLabels);

      const shootout = await contract.getReplicaShootout(shootoutId);
      const lockTime = Number(shootout[1]);
      const now = Math.floor(Date.now() / 1000);

      expect(lockTime).to.be.closeTo(now + maxDuration, 10);
    });

    it("Should handle minimum kicks (3)", async function () {
      const shootoutId = "min-kicks";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const kicks = await contract.getReplicaKicks(shootoutId);
      expect(kicks[0].length).to.equal(3);
    });
  });

  describe("Data Consistency", function () {
    it("Should maintain consistent data across queries", async function () {
      const shootoutId = "consistency-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3", "Kick 4"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      // Query multiple times
      const shootout1 = await contract.getReplicaShootout(shootoutId);
      const shootout2 = await contract.getReplicaShootout(shootoutId);

      expect(shootout1[0]).to.equal(shootout2[0]); // entryFee
      expect(shootout1[1]).to.equal(shootout2[1]); // lockTime
      expect(shootout1[2]).to.equal(shootout2[2]); // prizePool

      const kicks1 = await contract.getReplicaKicks(shootoutId);
      const kicks2 = await contract.getReplicaKicks(shootoutId);

      expect(kicks1[0].length).to.equal(kicks2[0].length);
      for (let i = 0; i < kicks1[0].length; i++) {
        expect(kicks1[0][i]).to.equal(kicks2[0][i]);
      }
    });

    it("Should maintain entry data integrity", async function () {
      const shootoutId = "integrity-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const picks = [0, 1, 1];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );

      // Query entry multiple times
      const entry1 = await contract.getReplicaEntry(shootoutId, player1.address);
      const entry2 = await contract.getReplicaEntry(shootoutId, player1.address);

      expect(entry1[0]).to.equal(entry2[0]); // exists
      expect(entry1[1]).to.equal(entry2[1]); // claimed
      expect(entry1[2].length).to.equal(entry2[2].length); // picks length

      for (let i = 0; i < entry1[2].length; i++) {
        expect(entry1[2][i]).to.equal(entry2[2][i]);
      }
    });
  });

  describe("Performance Benchmarks", function () {
    it("Should efficiently list many shootouts", async function () {
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      // Create 10 shootouts
      for (let i = 1; i <= 10; i++) {
        await contract.createReplicaShootout(
          `shootout-${i}`,
          ENTRY_FEE,
          duration,
          kickLabels
        );
      }

      const startTime = Date.now();
      const shootouts = await contract.listReplicaShootouts();
      const endTime = Date.now();

      console.log(`    Time to list 10 shootouts: ${endTime - startTime}ms`);

      expect(shootouts.length).to.equal(10);
      expect(endTime - startTime).to.be.lt(1000); // Should be under 1 second
    });
  });
});
