   // SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./IERC20.sol";

contract RaiseMoney {
    event Start(
        uint256 id,
        address benefactor,
        uint256 target,
        uint256 beginning,
        uint256 ending
    );
    event Give(uint256 id, address benefactors, uint256 amount);
    event UnGive(uint256 id, address benefactor, uint256 amount);
    event Withdrawal(uint256 id);
    event Refund(uint256 id, address benefactor, uint256 balance);

    // struct to pack the variables of the campaign

    struct Benefactors {
        address benefactor;
        uint256 amount;
    }

    // struct to pack the variables of the campaign
    struct Campaign {
        address payable beneficiary;
        uint256 moneyRaised;
        uint256 target;
        uint256 beginning;
        uint256 ending;
        bool withdrawn;
        Benefactors[] benefactorsInfo;
    }

    IERC20 public immutable token;

    mapping(uint256 => Campaign) public campaigns;

    // this mapping will be useful for ERC-20 transferFrom
    mapping(uint256 => mapping(address => uint256)) public trackRaisedMoney;

    uint256 public campaignCount;

    constructor(address _token) {
        if (_token == address(0)) revert();
        token = IERC20(_token);
    }
  function getEndDate(uint8 _days) private pure returns (uint256) {
        if (_days < 0) revert();
        return uint256(_days * 86400);
    }
    /*
     *@dev the _beginning param in the kickOff function
     * was modifed to block.timestamp
     */

    function kickOff(
        address _beneficiary,
        uint256 _target,
        uint8 _endingDays
    ) external returns (uint256) {
        // do this for auto-incrementation
        campaignCount++;
        campaigns[campaignCount].beneficiary = payable(_beneficiary);
        campaigns[campaignCount].moneyRaised = 0;
        campaigns[campaignCount].target = _target;
        campaigns[campaignCount].beginning = block.timestamp;
        campaigns[campaignCount].ending =
            campaigns[campaignCount].beginning +
            getEndDate(_endingDays);
        uint256 endDate = campaigns[campaignCount].ending;
        campaigns[campaignCount].withdrawn = false; // because the default of bool is false

        require(
            endDate < block.timestamp + 30 days,
            "Campaign must end in 30 days"
        );

        emit Start(
            campaignCount,
            _beneficiary,
            _target,
            block.timestamp,
            endDate
        );
        return campaignCount;
    }

    function give(uint256 _benefactorsId, uint256 _amount) external {
        require(
            campaigns[_benefactorsId].moneyRaised <=
                campaigns[_benefactorsId].target,
            "the target is reached already"
        );
        require(
            block.timestamp <= campaigns[_benefactorsId].ending,
            "can only give when the campaign has not ended"
        );

        token.transferFrom(msg.sender, address(this), _amount);
        campaigns[_benefactorsId].moneyRaised += _amount;
        trackRaisedMoney[_benefactorsId][msg.sender] += _amount;

        Campaign storage campaign = campaigns[_benefactorsId];
        campaign.benefactorsInfo.push(Benefactors(msg.sender, _amount));
        emit Give(_benefactorsId, msg.sender, _amount);
    }

    function undoGiving(uint256 _benefactorsId, uint256 _amount) external {
        require(
            block.timestamp <= campaigns[_benefactorsId].ending,
            "can only ungive when the campaign has not ended"
        );

        // check that user indeed has token balance using the TRACKTOKENRAISED MAPPING
        require(
            trackRaisedMoney[_benefactorsId][msg.sender] >= _amount,
            "Insufficient Balance"
        );

        campaigns[_benefactorsId].moneyRaised -= _amount;

        trackRaisedMoney[_benefactorsId][msg.sender] -= _amount;
        token.transfer(msg.sender, _amount);

        // to remove msg.sender from benefactors
        Campaign storage campaign = campaigns[_benefactorsId];
        uint256 len = campaign.benefactorsInfo.length;
        for (uint256 i = 0; i < len; ++i) {
            Benefactors memory person = campaign.benefactorsInfo[i];
            if (person.benefactor == msg.sender) {
                campaign.benefactorsInfo[i] = campaign.benefactorsInfo[len - 1];
            }
        }
        campaign.benefactorsInfo.pop();

        emit UnGive(_benefactorsId, msg.sender, _amount);
    }

    function withdrawal(uint256 _Id) external {
        require(
            campaigns[_Id].beneficiary == msg.sender,
            "Error, only the beneficiary can withdraw!"
        );
        require(
            block.timestamp > campaigns[_Id].ending,
            "cannot withdraw before ending"
        );

        require(campaigns[_Id].moneyRaised >= campaigns[_Id].target); // should be greater than or equal to
        require(!campaigns[_Id].withdrawn, "Withdrawn already"); // recall that the default of bool is false

        campaigns[_Id].withdrawn = true;
        token.transfer(campaigns[_Id].beneficiary, campaigns[_Id].moneyRaised);

        emit Withdrawal(_Id);
    }

    // if the goal of the campaign is not met, everyone who donated should be refunded
    function refund(uint256 _benefactorsId) external {
        require(
            block.timestamp > campaigns[_benefactorsId].ending,
            "cannot withdraw before ending"
        );
        require(
            campaigns[_benefactorsId].moneyRaised <
                campaigns[_benefactorsId].target
        );

        uint256 bal = trackRaisedMoney[_benefactorsId][msg.sender];
        // reset the balance
        trackRaisedMoney[_benefactorsId][msg.sender] = 0;
        token.transfer(msg.sender, bal);

        emit Refund(_benefactorsId, msg.sender, bal);
    }

      // to check if a particular count of fundraising has been successful
    function checkSuccess(uint256 _campaignCount)
        external
        view
        returns (bool success)
    {
        if (
            campaigns[_campaignCount].moneyRaised >=
            campaigns[_campaignCount].target
            // should be greater than or equal to
        ) {
            success = true;
        }
    }

    function getContributorAmount(uint256 _benefactorsInfo)
        external
        view
        returns (uint256)
    {
        // the Data of everyone who contributed to the project is stored in the trackRaisedMoney mapping
        return trackRaisedMoney[_benefactorsInfo][msg.sender];
    }

    // this function fetches us the data of everyone who contributed to the campaign
    // first their number and the addresses of each of them
    function getBenefactors(uint256 _benefactorsInfo)
        external
        view
        returns (Benefactors[] memory)
    {
        // the Data of everyone who contributed to the project is stored in the trackRaisedMoney mapping
        // generally unhealthy to use an array

        Campaign memory campaign = campaigns[_benefactorsInfo];
        // return campaigns[_benefactorsInfo].length;

        return campaign.benefactorsInfo;
    }
}