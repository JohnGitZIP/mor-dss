// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.6.12;

import { DssAction } from "../dss-exec-lib/DssAction.sol";
import { DssExec } from "../dss-exec-lib/DssExec.sol";
import { DssExecLib } from "../dss-exec-lib/DssExecLib.sol";

contract DssSpellAction is DssAction
{
    // Provides a descriptive tag for bot consumption
    // This should be modified weekly to provide a summary of the actions
    // Hash: seth keccak -- "$(wget https://raw.githubusercontent.com/growthdefi/community/master/governance/votes/Executive%20vote%20-%20October%2014%2C%202021.md -q -O - 2>/dev/null)"
    string public constant override description =
        "2021-10-14 GrowthDeFi Executive Spell | Hash: 0x0000000000000000000000000000000000000000000000000000000000000000";

    function actions() public override
    {
        DssExecLib.setChangelogVersion("1.0.0");
    }
}

contract DssSpell is DssExec
{
    constructor(address log)
        DssExec(log, block.timestamp + 30 days, address(new DssSpellAction())) public
    {
    }
}