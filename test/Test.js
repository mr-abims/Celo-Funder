const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect, assert } = require("chai");
const { ethers } = require("hardhat");

describe("Deploy Raisemoney", function () {
  // We define a fixture to reuse the same setup in every test. or use a beforeEach function
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployRaiseMoney() {
    // const ONE_ETH = 1_000_000_000_000_000_000_000;

    const getThousand = ethers.utils.parseUnits("1000", "ether");
    const getFiveHundred = ethers.utils.parseUnits("500", "ether");
    const getTwoHundred = ethers.utils.parseUnits("200", "ether");
    const getHundred = ethers.utils.parseUnits("100", "ether");
    const getFifty = ethers.utils.parseUnits("50", "ether");

    // Contracts are deployed using the first signer/account by default
    const [owner, user1, user2, user3] = await ethers.getSigners();

    const raise_Money = await ethers.getContractFactory("RaiseMoney");
    const test_ERC = await ethers.getContractFactory("MobiCoin");

    const testERC = await test_ERC.deploy(getThousand);
    const raiseMoney = await raise_Money.deploy(testERC.address);

    return {
      testERC,
      raiseMoney,
      owner,
      user1,
      user2,
      user3,
      getThousand,
      getFiveHundred,
      getTwoHundred,
      getHundred,
      getFifty,
    };
  }

  describe("Deployment", function () {
    async function loadTokenfeatures() {
      const {
        testERC,
        raiseMoney,
        owner,
        user1,
        user2,
        user3,
        getThousand,
        getFiveHundred,
        getTwoHundred,
        getHundred,
        getFifty,
      } = await loadFixture(deployRaiseMoney);
      let tx1 = await testERC.connect(user1).mintMore(getFiveHundred);
      let tx2 = await testERC.connect(user2).mintMore(getFiveHundred);
      let tx3 = await testERC.connect(user3).mintMore(getFiveHundred);

      let ownerBalance = await testERC.balanceOf(owner.address);
      let user1Bal = await testERC.balanceOf(user1.address);
      let user2Bal = await testERC.balanceOf(user2.address);
      let user3Bal = await testERC.balanceOf(user3.address);

      return {
        ownerBalance,
        user1Bal,
        user2Bal,
        user3Bal,
        testERC,
        raiseMoney,
        owner,
        user1,
        user2,
        user3,
        getThousand,
        getFiveHundred,
        getTwoHundred,
        getHundred,
        getFifty,
      };
    }

    it("Should mint more coins for other users", async function () {
      // To load state from fixtures
      const {
        ownerBalance,
        user1Bal,
        user2Bal,
        user3Bal,
        user4Bal,
        getThousand,
        getFiveHundred,
      } = await loadFixture(loadTokenfeatures);

      expect(ownerBalance).to.equal(getThousand);
      expect(user1Bal).to.equal(getFiveHundred);
      expect(user2Bal).to.equal(getFiveHundred);
      expect(user3Bal).to.equal(getFiveHundred);
    });

    it("Should set the right token address", async function () {
      // loading from fixtures...
      const { testERC, raiseMoney } = await loadFixture(loadTokenfeatures);

      expect(await raiseMoney.token()).to.equal(testERC.address);
    });

    it("should be able to kickoff properly", async function () {
      const { owner, user1, user2, raiseMoney, getTwoHundred } =
        await loadFixture(deployRaiseMoney);

      let tx1 = await raiseMoney
        .connect(owner)
        .kickOff(user1.address, getTwoHundred, 29);
      let campaignCount = await raiseMoney.campaignCount();
      expect(campaignCount).to.equal(1);

      // To test an error due to the condition "Campaign must end in 30 days"
      await expect(
        raiseMoney.connect(user2).kickOff(user2.address, getTwoHundred, 31)
      ).to.be.reverted;
    });
    // console.log("Kickoff works as expected!");

    it("Should be able to give properly", async function () {
      const {
        owner,
        user1,
        user2,
        user3,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 29);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user3).approve(raiseMoney.address, getFiveHundred);

      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      let [beneficiary, moneyraised] = await raiseMoney.campaigns(1);

      expect(moneyraised).to.be.greaterThanOrEqual(getTwoHundred);

      // To track the raised money of an address
      let user2contributions = await raiseMoney
        .connect(user2)
        .trackRaisedMoney(1, user2.address);
      expect(user2contributions).to.equal(getTwoHundred);

      // To test that a user can't give after target is reached
      await expect(raiseMoney.connect(user2).give(1, getTwoHundred)).to.be
        .reverted;

      // console.log(await raiseMoney.getBenefactors(1));
    });

    it("Should Undo giving", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      // to ungive
      await raiseMoney.connect(user1).undoGiving(1, getFifty);

      let user1contributions = await raiseMoney.trackRaisedMoney(
        1,
        user1.address
      );
      expect(user1contributions).to.equal(0);

      // It shoud fail when a user attempts to ungive beyond his balance
      await expect(raiseMoney.connect(user1).undoGiving(1, getFiveHundred)).to
        .be.reverted;
    });

    it("Should Check Success after campaign target is reached", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);
      let checkSuccessBool = await raiseMoney.checkSuccess(1);
      expect(checkSuccessBool).to.equal(true);
    });
  });

  describe("Withdrawals", function () {
    // Using fixures again
    async function loadTokenfeatures() {
      const {
        testERC,
        raiseMoney,
        owner,
        user1,
        user2,
        user3,
        getThousand,
        getFiveHundred,
        getTwoHundred,
        getHundred,
        getFifty,
      } = await loadFixture(deployRaiseMoney);
      let tx1 = await testERC.connect(user1).mintMore(getFiveHundred);
      let tx2 = await testERC.connect(user2).mintMore(getFiveHundred);
      let tx3 = await testERC.connect(user3).mintMore(getFiveHundred);

      let ownerBalance = await testERC.balanceOf(owner.address);
      let user1Bal = await testERC.balanceOf(user1.address);
      let user2Bal = await testERC.balanceOf(user2.address);
      let user3Bal = await testERC.balanceOf(user3.address);

      return {
        ownerBalance,
        user1Bal,
        user2Bal,
        user3Bal,
        testERC,
        raiseMoney,
        owner,
        user1,
        user2,
        user3,
        getThousand,
        getFiveHundred,
        getTwoHundred,
        getHundred,
        getFifty,
      };
    }

    it("Should revert with the right error if called too soon", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      await expect(raiseMoney.connect(user1).withdrawal(1)).to.be.revertedWith(
        "cannot withdraw before ending"
      );
    });

    it("Should revert with the right error if called from another account", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      await expect(raiseMoney.connect(user2).withdrawal(1)).to.be.revertedWith(
        "Error, only the beneficiary can withdraw!"
      );
    });

    it("Shouldn't fail if the unlockTime has arrived and the owner calls it", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney.connect(owner).kickOff(user1.address, getTwoHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      const ONE_MONTH_IN_SECS = 31 * 24 * 60 * 60;
      const unlockTime = (await time.latest()) + ONE_MONTH_IN_SECS;

      // Transactions are sent using the first signer by default
      await time.increaseTo(unlockTime);

      await expect(raiseMoney.connect(user1).withdrawal(1)).not.to.be.reverted;
    });

    it("Refund Benefactors tokens if target isn't met", async function () {
      const {
        owner,
        user1,
        user2,
        raiseMoney,
        testERC,
        getFiveHundred,
        getTwoHundred,
        getFifty,
      } = await loadFixture(loadTokenfeatures);
      await raiseMoney
        .connect(owner)
        .kickOff(user1.address, getFiveHundred, 20);
      // To approve the contract
      await testERC.connect(user1).approve(raiseMoney.address, getFiveHundred);
      await testERC.connect(user2).approve(raiseMoney.address, getFiveHundred);

      // to give
      await raiseMoney.connect(user1).give(1, getFifty);
      await raiseMoney.connect(user2).give(1, getTwoHundred);

      const ONE_MONTH_IN_SECS = 31 * 24 * 60 * 60;
      const unlockTime = (await time.latest()) + ONE_MONTH_IN_SECS;

      // Transactions are sent using the first signer by default
      await time.increaseTo(unlockTime);

      await expect(raiseMoney.connect(user1).refund(1)).not.to.be.reverted;
    });
  });
});