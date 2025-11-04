const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AuroraPenaltyGrid", function () {
  let contract;
  let owner, player1, player2, player3;
  const MIN_ENTRY_FEE = ethers.parseEther("0.0005");
  const ENTRY_FEE = ethers.parseEther("0.001");

  beforeEach(async function () {
    [owner, player1, player2, player3] = await ethers.getSigners();

    const AuroraPenaltyGrid = await ethers.getContractFactory("AuroraPenaltyGrid");
    contract = await AuroraPenaltyGrid.deploy();
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct minimum entry fee", async function () {
      expect(await contract.MIN_ENTRY_FEE()).to.equal(MIN_ENTRY_FEE);
    });

    it("Should start with zero shootouts", async function () {
      const shootouts = await contract.listReplicaShootouts();
      expect(shootouts.length).to.equal(0);
    });
  });

  describe("Shootout Creation", function () {
    it("Should create a shootout with valid parameters", async function () {
      const shootoutId = "test-shootout-1";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"];
      const duration = 7 * 24 * 60 * 60; // 7 days

      await contract.createReplicaShootout(
        shootoutId,
        ENTRY_FEE,
        duration,
        kickLabels
      );

      const shootouts = await contract.listReplicaShootouts();
      expect(shootouts.length).to.equal(1);
      expect(shootouts[0]).to.equal(shootoutId);
    });

    it("Should reject entry fee below minimum", async function () {
      const shootoutId = "test-shootout-2";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 3 * 24 * 60 * 60;
      const lowFee = ethers.parseEther("0.0001");

      await expect(
        contract.createReplicaShootout(shootoutId, lowFee, duration, kickLabels)
      ).to.be.revertedWith("Entry fee too low");
    });

    it("Should reject duration less than 1 day", async function () {
      const shootoutId = "test-shootout-3";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const shortDuration = 12 * 60 * 60; // 12 hours

      await expect(
        contract.createReplicaShootout(shootoutId, ENTRY_FEE, shortDuration, kickLabels)
      ).to.be.revertedWith("Duration must be 1-10 days");
    });

    it("Should reject duration more than 10 days", async function () {
      const shootoutId = "test-shootout-4";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const longDuration = 11 * 24 * 60 * 60; // 11 days

      await expect(
        contract.createReplicaShootout(shootoutId, ENTRY_FEE, longDuration, kickLabels)
      ).to.be.revertedWith("Duration must be 1-10 days");
    });

    it("Should reject less than 3 kicks", async function () {
      const shootoutId = "test-shootout-5";
      const kickLabels = ["Kick 1", "Kick 2"];
      const duration = 7 * 24 * 60 * 60;

      await expect(
        contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels)
      ).to.be.revertedWith("Must have 3-12 kicks");
    });

    it("Should reject more than 12 kicks", async function () {
      const shootoutId = "test-shootout-6";
      const kickLabels = Array.from({ length: 13 }, (_, i) => `Kick ${i + 1}`);
      const duration = 7 * 24 * 60 * 60;

      await expect(
        contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels)
      ).to.be.revertedWith("Must have 3-12 kicks");
    });

    it("Should reject duplicate shootout IDs", async function () {
      const shootoutId = "test-shootout-7";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      await expect(
        contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels)
      ).to.be.revertedWith("Shootout already exists");
    });
  });

  describe("Shootout Data Retrieval", function () {
    beforeEach(async function () {
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"];
      const duration = 7 * 24 * 60 * 60;
      await contract.createReplicaShootout("shootout-1", ENTRY_FEE, duration, kickLabels);
    });

    it("Should retrieve shootout basic info", async function () {
      const shootout = await contract.getReplicaShootout("shootout-1");

      expect(shootout[0]).to.equal(ENTRY_FEE); // entryFee
      expect(shootout[2]).to.be.gt(0); // prizePool (should be 0 initially)
      expect(shootout[3]).to.equal(false); // cancelled
      expect(shootout[4]).to.equal(false); // settled
      expect(shootout[5]).to.equal(false); // pushAll
    });

    it("Should retrieve kick labels", async function () {
      const kicks = await contract.getReplicaKicks("shootout-1");

      expect(kicks[0].length).to.equal(5);
      expect(kicks[0][0]).to.equal("Kick 1");
      expect(kicks[0][4]).to.equal("Kick 5");
    });

    it("Should return empty data for non-existent shootout", async function () {
      const shootout = await contract.getReplicaShootout("non-existent");
      expect(shootout[0]).to.equal(0); // entryFee should be 0
    });
  });

  describe("Entry Participation", function () {
    const shootoutId = "entry-test";
    const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
    const duration = 7 * 24 * 60 * 60;

    beforeEach(async function () {
      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);
    });

    it("Should allow entry with correct fee and encrypted weight", async function () {
      const picks = [0, 1, 0]; // Goal, Save, Goal
      const encryptedWeight = "0x" + "00".repeat(32); // Mock encrypted data
      const proof = "0x" + "00".repeat(32); // Mock proof

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId,
          picks,
          encryptedWeight,
          proof,
          { value: ENTRY_FEE }
        )
      ).to.not.be.reverted;
    });

    it("Should reject entry with incorrect fee", async function () {
      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);
      const wrongFee = ethers.parseEther("0.0005");

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId,
          picks,
          encryptedWeight,
          proof,
          { value: wrongFee }
        )
      ).to.be.revertedWith("Incorrect entry fee");
    });

    it("Should reject entry with wrong number of picks", async function () {
      const picks = [0, 1]; // Only 2 picks instead of 3
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId,
          picks,
          encryptedWeight,
          proof,
          { value: ENTRY_FEE }
        )
      ).to.be.revertedWith("Pick count mismatch");
    });

    it("Should reject entry with invalid pick values", async function () {
      const picks = [0, 1, 2]; // 2 is invalid (only 0 or 1 allowed)
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId,
          picks,
          encryptedWeight,
          proof,
          { value: ENTRY_FEE }
        )
      ).to.be.revertedWith("Pick must be 0 or 1");
    });

    it("Should reject duplicate entry from same address", async function () {
      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        shootoutId,
        picks,
        encryptedWeight,
        proof,
        { value: ENTRY_FEE }
      );

      await expect(
        contract.connect(player1).enterReplicaShootout(
          shootoutId,
          picks,
          encryptedWeight,
          proof,
          { value: ENTRY_FEE }
        )
      ).to.be.revertedWith("Already entered");
    });
  });

  describe("Prize Pool Accumulation", function () {
    it("Should accumulate entry fees in prize pool", async function () {
      const shootoutId = "pool-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      // Three players enter
      await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player2).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player3).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );

      const shootout = await contract.getReplicaShootout(shootoutId);
      const expectedPool = ENTRY_FEE * 3n;
      expect(shootout[2]).to.equal(expectedPool); // prizePool
    });
  });

  describe("Entry Retrieval", function () {
    const shootoutId = "retrieval-test";
    const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];

    beforeEach(async function () {
      await contract.createReplicaShootout(
        shootoutId,
        ENTRY_FEE,
        7 * 24 * 60 * 60,
        kickLabels
      );

      const picks = [0, 1, 1];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
    });

    it("Should retrieve user entry correctly", async function () {
      const entry = await contract.getReplicaEntry(shootoutId, player1.address);

      expect(entry[0]).to.equal(true); // exists
      expect(entry[1]).to.equal(false); // claimed
      expect(entry[2].length).to.equal(3); // picks length
      expect(entry[2][0]).to.equal(0); // First pick: Goal
      expect(entry[2][1]).to.equal(1); // Second pick: Save
      expect(entry[2][2]).to.equal(1); // Third pick: Save
    });

    it("Should return false for non-participant", async function () {
      const entry = await contract.getReplicaEntry(shootoutId, player2.address);
      expect(entry[0]).to.equal(false); // exists should be false
    });
  });

  describe("Gas Optimization", function () {
    it("Should use reasonable gas for shootout creation", async function () {
      const shootoutId = "gas-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3", "Kick 4", "Kick 5"];
      const duration = 7 * 24 * 60 * 60;

      const tx = await contract.createReplicaShootout(
        shootoutId,
        ENTRY_FEE,
        duration,
        kickLabels
      );
      const receipt = await tx.wait();

      console.log(`    Gas used for creation: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(500000); // Should be well under 500k gas
    });

    it("Should use reasonable gas for entry", async function () {
      const shootoutId = "gas-entry-test";
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      await contract.createReplicaShootout(shootoutId, ENTRY_FEE, duration, kickLabels);

      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      const tx = await contract.connect(player1).enterReplicaShootout(
        shootoutId, picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      const receipt = await tx.wait();

      console.log(`    Gas used for entry: ${receipt.gasUsed.toString()}`);
      expect(receipt.gasUsed).to.be.lt(300000); // Should be under 300k gas
    });
  });

  describe("Multiple Shootouts", function () {
    it("Should support multiple active shootouts", async function () {
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;

      for (let i = 1; i <= 5; i++) {
        await contract.createReplicaShootout(
          `shootout-${i}`,
          ENTRY_FEE,
          duration,
          kickLabels
        );
      }

      const shootouts = await contract.listReplicaShootouts();
      expect(shootouts.length).to.equal(5);
    });

    it("Should allow same user to enter multiple shootouts", async function () {
      const kickLabels = ["Kick 1", "Kick 2", "Kick 3"];
      const duration = 7 * 24 * 60 * 60;
      const picks = [0, 1, 0];
      const encryptedWeight = "0x" + "00".repeat(32);
      const proof = "0x" + "00".repeat(32);

      await contract.createReplicaShootout("shootout-a", ENTRY_FEE, duration, kickLabels);
      await contract.createReplicaShootout("shootout-b", ENTRY_FEE, duration, kickLabels);

      await contract.connect(player1).enterReplicaShootout(
        "shootout-a", picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );
      await contract.connect(player1).enterReplicaShootout(
        "shootout-b", picks, encryptedWeight, proof, { value: ENTRY_FEE }
      );

      const entryA = await contract.getReplicaEntry("shootout-a", player1.address);
      const entryB = await contract.getReplicaEntry("shootout-b", player1.address);

      expect(entryA[0]).to.equal(true);
      expect(entryB[0]).to.equal(true);
    });
  });
});
