// SPDX-License-Identifier: AGPL-3.0-or-later

pragma solidity ^0.6.0;

import { DSNote } from "../ds-note/note.sol";
import { DSToken } from "../ds-token/token.sol";
import { PipLike } from "../dss/spot.sol";
import { UniswapV2PairLike } from "../univ2-lp-oracle/UNIV2LPOracle.sol";

interface OracleLike
{
    function consultAveragePrice(address _pair, address _token, uint256 _amountIn) external view returns (uint256 _amountOut);
    function updateAveragePrice(address _pair) external;
}

contract UniV2TwapOracle is DSNote, PipLike {

    // --- Auth ---
    mapping (address => uint256) public wards;
    function rely(address _usr) external note auth { wards[_usr] = 1;  }
    function deny(address _usr) external note auth { wards[_usr] = 0; }
    modifier auth {
        require(wards[msg.sender] == 1, "UniV2TwapOracle/not-authorized");
        _;
    }

    address public immutable src;     // Price source (LP)
    address public immutable token;   // Token from the pair (the other must be PSM-pegged coin, like BUSD)
    uint256 public immutable cap;     // Price cap
    uint256 public immutable unit;    // Price unit

    address public stwap;             // Short window TWAP implementation
    address public ltwap;             // Large window TWAP implementation

    // --- Whitelisting ---
    mapping (address => uint256) public bud;
    modifier toll { require(bud[msg.sender] == 1, "UniV2TwapOracle/contract-not-whitelisted"); _; }

    constructor (address _stwap, address _ltwap, address _src, address _token, uint256 _cap) public {
        require(_stwap != address(0), "UniV2TwapOracle/invalid-short-twap-address");
        require(_ltwap != address(0), "UniV2TwapOracle/invalid-long-twap-address");
        require(_src   != address(0), "UniV2TwapOracle/invalid-src-address");
        require(_token != address(0), "UniV2TwapOracle/invalid-token-address");
        require(_token == UniswapV2PairLike(_src).token0() || _token == UniswapV2PairLike(_src).token1(), "UniV2TwapOracle/unknown-token-address");
        uint8 _dec = DSToken(_token).decimals();
        require(_dec   <=         18, "UniV2TwapOracle/invalid-dec-places");
        wards[msg.sender] = 1;
        stwap = _stwap;
        ltwap = _ltwap;
        src  = _src;
        token = _token;
        cap = _cap > 0 ? _cap : uint256(-1);
        unit = 10 ** uint256(_dec);
    }

    function link(uint256 _id, address _twap) external note auth {
        require(_twap != address(0), "UniV2TwapOracle/no-contract");
        if(_id == 0) {
            stwap = _twap;
        } else if (_id == 1) {
            ltwap = _twap;
        } else {
            revert("UniV2TwapOracle/invalid-id");
        }
    }

    function poke() external {
        OracleLike(stwap).updateAveragePrice(src);
        OracleLike(ltwap).updateAveragePrice(src);
    }

    function read() external view override toll returns (bytes32) {
        uint256 sprice = OracleLike(stwap).consultAveragePrice(src, token, unit);
        uint256 lprice = OracleLike(ltwap).consultAveragePrice(src, token, unit);
        uint256 price = sprice < lprice ? sprice : lprice;
        if (price > cap) price = cap;
        require(price > 0, "UniV2TwapOracle/invalid-price-feed");
        return bytes32(price);
    }

    function peek() external view override toll returns (bytes32,bool) {
        uint256 sprice = OracleLike(stwap).consultAveragePrice(src, token, unit);
        uint256 lprice = OracleLike(ltwap).consultAveragePrice(src, token, unit);
        uint256 price = sprice < lprice ? sprice : lprice;
        if (price > cap) price = cap;
        return (bytes32(price), price > 0);
    }

    function kiss(address a) external note auth {
        require(a != address(0), "UniV2TwapOracle/no-contract-0");
        bud[a] = 1;
    }

    function diss(address a) external note auth {
        bud[a] = 0;
    }

    function kiss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            require(a[i] != address(0), "UniV2TwapOracle/no-contract-0");
            bud[a[i]] = 1;
        }
    }

    function diss(address[] calldata a) external note auth {
        for(uint i = 0; i < a.length; i++) {
            bud[a[i]] = 0;
        }
    }
}
