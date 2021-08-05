// SPDX-License-Identifier: AGPL-3.0-or-later
pragma solidity ^0.6.0;

import { LibNote } from "../median/median.sol";
import { ERC20Like_, OracleLike } from "../univ2-lp-oracle/UNIV2LPOracle.sol";

interface VaultLike {
    function reserveToken() external view returns (address _reserveToken);
    function totalSupply() external view returns (uint256 _totalSupply);
    function totalReserve() external view returns (uint256 _totalReserve);
}

contract VaultOracle is LibNote {

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address _usr) external auth { wards[_usr] = 1;  }
    function deny(address _usr) external auth { wards[_usr] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "VaultOracle/not-authorized");
        _;
    }

    // --- Math ---
    function mul(uint x, uint y) internal pure returns (uint z) {
        require(y == 0 || (z = x * y) / y == x);
    }

    address public immutable vault;  // vault for which shares are being priced
    address public immutable orb;    // oracle for the reserve token

    // --- Whitelisting ---
    mapping (address => uint256) public bud;
    modifier toll { require(bud[msg.sender] == 1, "VaultOracle/contract-not-whitelisted"); _; }

    constructor (address _vault, address _orb) public {
        require(ERC20Like_(_vault).decimals() == ERC20Like_(VaultLike(_vault).reserveToken()).decimals(), "VaultOracle/token-dec-mismatch");
        wards[msg.sender] = 1;
        vault = _vault;
        orb = _orb;
    }

    function read() external view toll returns (uint256) {
        uint256 reservePrice = OracleLike(orb).read();
        require(reservePrice != 0, "VaultOracle/invalid-oracle-price");

        uint256 reserve = VaultLike(vault).totalReserve();
        uint256 supply = VaultLike(vault).totalSupply();
        require(reserve > 0 && supply > 0, "VaultOracle/empty-vault");

        uint256 sharePrice = mul(reservePrice, reserve) / supply;
        require(sharePrice > 0, "VaultOracle/invalid-price-feed");

        return sharePrice;
    }

    function peek() external view toll returns (uint256,bool) {
        (uint256 reservePrice, bool valid) = OracleLike(orb).peek();
        if (valid) valid = reservePrice != 0;

        uint256 reserve = VaultLike(vault).totalReserve();
        uint256 supply = VaultLike(vault).totalSupply();
        if (valid) valid = reserve > 0 && supply > 0;

        uint256 sharePrice = supply > 0 ? mul(reservePrice, reserve) / supply : 0;
        if (valid) valid = sharePrice > 0;

        return (sharePrice, valid);
    }

    function kiss(address a) external note auth {
        require(a != address(0), "VaultOracle/no-contract-0");
        bud[a] = 1;
    }

    function diss(address a) external note auth {
        bud[a] = 0;
    }

    function kiss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            require(a[i] != address(0), "VaultOracle/no-contract-0");
            bud[a[i]] = 1;
        }
    }

    function diss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            bud[a[i]] = 0;
        }
    }
}
