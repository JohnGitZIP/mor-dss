// SPDX-License-Identifier: AGPL-3.0-or-later

/// DssDeploy.sol

// Copyright (C) 2018-2020 Maker Ecosystem Growth Holdings, INC.

// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity >=0.5.12;

import {DSAuth, DSAuthority} from "./ds-auth/auth.sol";
import {DSPause, DSPauseProxy} from "./ds-pause/pause.sol";

import {Vat} from "./dss/vat.sol";
import {Jug} from "./dss/jug.sol";
import {Vow} from "./dss/vow.sol";
import {Cat} from "./dss/cat.sol";
import {Dog} from "./dss/dog.sol";
import {DaiJoin} from "./dss/join.sol";
import {Flapper} from "./dss/flap.sol";
import {Flopper} from "./dss/flop.sol";
import {Flipper} from "./dss/flip.sol";
import {Clipper} from "./dss/clip.sol";
import {Dai} from "./dss/dai.sol";
import {End} from "./dss/end.sol";
import {ESM} from "./esm/ESM.sol";
import {Pot} from "./dss/pot.sol";
import {Spotter} from "./dss/spot.sol";

contract VatFab {
    function newVat(address owner) public returns (Vat vat) {
        vat = new Vat();
        vat.rely(owner);
        vat.deny(address(this));
    }
}

contract JugFab {
    function newJug(address owner, address vat) public returns (Jug jug) {
        jug = new Jug(vat);
        jug.rely(owner);
        jug.deny(address(this));
    }
}

contract VowFab {
    function newVow(address owner, address vat, address flap, address flop) public returns (Vow vow) {
        vow = new Vow(vat, flap, flop);
        vow.rely(owner);
        vow.deny(address(this));
    }
}

contract CatFab {
    function newCat(address owner, address vat) public returns (Cat cat) {
        cat = new Cat(vat);
        cat.rely(owner);
        cat.deny(address(this));
    }
}

contract DogFab {
    function newDog(address owner, address vat) public returns (Dog dog) {
        dog = new Dog(vat);
        dog.rely(owner);
        dog.deny(address(this));
    }
}

contract DaiFab {
    function newDai(address owner, uint chainId) public returns (Dai dai) {
        dai = new Dai(chainId);
        dai.rely(owner);
        dai.deny(address(this));
    }
}

contract DaiJoinFab {
    function newDaiJoin(address vat, address dai) public returns (DaiJoin daiJoin) {
        daiJoin = new DaiJoin(vat, dai);
    }
}

contract FlapFab {
    function newFlap(address owner, address vat, address gov) public returns (Flapper flap) {
        flap = new Flapper(vat, gov);
        flap.rely(owner);
        flap.deny(address(this));
    }
}

contract FlopFab {
    function newFlop(address owner, address vat, address gov) public returns (Flopper flop) {
        flop = new Flopper(vat, gov);
        flop.rely(owner);
        flop.deny(address(this));
    }
}

contract FlipFab {
    function newFlip(address owner, address vat, address cat, bytes32 ilk) public returns (Flipper flip) {
        flip = new Flipper(vat, cat, ilk);
        flip.rely(owner);
        flip.deny(address(this));
    }
}

contract ClipFab {
    function newClip(address owner, address vat, address spotter, address dog, bytes32 ilk) public returns (Clipper clip) {
        clip = new Clipper(vat, spotter, dog, ilk);
        clip.rely(owner);
        clip.deny(address(this));
    }
}

contract SpotFab {
    function newSpotter(address owner, address vat) public returns (Spotter spotter) {
        spotter = new Spotter(vat);
        spotter.rely(owner);
        spotter.deny(address(this));
    }
}

contract PotFab {
    function newPot(address owner, address vat) public returns (Pot pot) {
        pot = new Pot(vat);
        pot.rely(owner);
        pot.deny(address(this));
    }
}

contract EndFab {
    function newEnd(address owner) public returns (End end) {
        end = new End();
        end.rely(owner);
        end.deny(address(this));
    }
}

contract ESMFab {
    function newESM(address gov, address end, address proxy, uint min) public returns (ESM esm) {
        esm = new ESM(gov, end, proxy, min);
    }
}

contract PauseFab {
    function newPause(uint delay, address owner, DSAuthority authority) public returns(DSPause pause) {
        pause = new DSPause(delay, owner, authority);
    }
}

contract DssDeploy is DSAuth {
    VatFab     private vatFab;
    JugFab     private jugFab;
    VowFab     private vowFab;
    CatFab     private catFab;
    DogFab     private dogFab;
    DaiFab     private daiFab;
    DaiJoinFab private daiJoinFab;
    FlapFab    private flapFab;
    FlopFab    private flopFab;
    FlipFab    private flipFab;
    ClipFab    private clipFab;
    SpotFab    private spotFab;
    PotFab     private potFab;
    EndFab     private endFab;
    ESMFab     private esmFab;
    PauseFab   private pauseFab;

    DSPauseProxy private pauseProxy;

    struct Mods {
        Vat     vat;
        Jug     jug;
        Vow     vow;
        Cat     cat;
        Dog     dog;
        Dai     dai;
        DaiJoin daiJoin;
        Flapper flap;
        Flopper flop;
        Spotter spotter;
        Pot     pot;
        End     end;
        ESM     esm;
        DSPause pause;
    }

    Mods public mods;
    mapping(bytes32 => Ilk) public ilks;

    uint8 public step = 0;

    uint256 constant ONE = 10 ** 27;

    struct Ilk {
        Flipper flip;
        Clipper clip;
        address join;
    }

    constructor (
        VatFab vatFab_,
        JugFab jugFab_,
        VowFab vowFab_,
        CatFab catFab_,
        DogFab dogFab_,
        DaiFab daiFab_,
        DaiJoinFab daiJoinFab_,
        FlapFab flapFab_,
        FlopFab flopFab_,
        FlipFab flipFab_,
        ClipFab clipFab_,
        SpotFab spotFab_,
        PotFab potFab_,
        EndFab endFab_,
        ESMFab esmFab_,
        PauseFab pauseFab_
    ) public {
        vatFab = vatFab_;
        jugFab = jugFab_;
        vowFab = vowFab_;
        catFab = catFab_;
        dogFab = dogFab_;
        daiFab = daiFab_;
        daiJoinFab = daiJoinFab_;
        flapFab = flapFab_;
        flopFab = flopFab_;
        flipFab = flipFab_;
        clipFab = clipFab_;
        spotFab = spotFab_;
        potFab = potFab_;
        endFab = endFab_;
        esmFab = esmFab_;
        pauseFab = pauseFab_;
    }

    function rad(uint wad) internal pure returns (uint) {
        return wad * 10 ** 27;
    }

    function deploy1(uint256 chainId, address gov) external auth {
        require(address(mods.vat) == address(0), "Already deployed");

        // Deploy Vat
        Vat vat = vatFab.newVat(address(this));
        Spotter spotter = spotFab.newSpotter(address(this), address(vat));
        {
            vat.rely(address(spotter));
            mods.vat = vat;
            mods.spotter = spotter;
        }

        // Deploy Dai
        {
            Dai dai = daiFab.newDai(address(this), chainId);
            DaiJoin daiJoin = daiJoinFab.newDaiJoin(address(vat), address(dai));
            dai.rely(address(daiJoin));
            mods.dai = dai;
            mods.daiJoin = daiJoin;
        }

        // Deploy Taxation
        Jug jug = jugFab.newJug(address(this), address(vat));
        Pot pot = potFab.newPot(address(this), address(vat));
        {
            vat.rely(address(jug));
            vat.rely(address(pot));
            mods.jug = jug;
            mods.pot = pot;
        }

        // Deploy Auctions
        {
            Flapper flap = flapFab.newFlap(address(this), address(vat), gov);
            Flopper flop = flopFab.newFlop(address(this), address(vat), gov);
            Vow vow = vowFab.newVow(address(this), address(vat), address(flap), address(flop));
            jug.file("vow", address(vow));
            pot.file("vow", address(vow));
            vat.rely(address(flop));
            flap.rely(address(vow));
            flop.rely(address(vow));
            mods.flap = flap;
            mods.flop = flop;
            mods.vow = vow;
        }
    }

    function deploy2(address gov, uint delay, DSAuthority authority, uint256 min) external auth {
        require(address(mods.cat) == address(0), "Already deployed");

        Vat vat = mods.vat;
        Spotter spotter = mods.spotter;
        Jug jug = mods.jug;
        Pot pot = mods.pot;
        Vow vow = mods.vow;

        // Deploy Liquidator
        Cat cat = catFab.newCat(address(this), address(vat));
        Dog dog = dogFab.newDog(address(this), address(vat));
        {
            cat.file("vow", address(vow));
            dog.file("vow", address(vow));
            vat.rely(address(cat));
            vat.rely(address(dog));
            vow.rely(address(cat));
            vow.rely(address(dog));
            mods.cat = cat;
            mods.dog = dog;
        }

        // Deploy End
        End end = endFab.newEnd(address(this));
        {
            end.file("vat", address(vat));
            end.file("cat", address(cat));
            end.file("dog", address(dog));
            end.file("vow", address(vow));
            end.file("pot", address(pot));
            end.file("spot", address(spotter));
            vat.rely(address(end));
            cat.rely(address(end));
            dog.rely(address(end));
            vow.rely(address(end));
            pot.rely(address(end));
            spotter.rely(address(end));
            mods.end = end;
        }

        // Deploy Pause
        {
            DSPause pause = pauseFab.newPause(delay, address(0), authority);
            DSPauseProxy _pauseProxy = pause.proxy();
            vat.rely(address(_pauseProxy));
            cat.rely(address(_pauseProxy));
            dog.rely(address(_pauseProxy));
            vow.rely(address(_pauseProxy));
            jug.rely(address(_pauseProxy));
            pot.rely(address(_pauseProxy));
            spotter.rely(address(_pauseProxy));
            mods.flap.rely(address(_pauseProxy));
            mods.flop.rely(address(_pauseProxy));
            end.rely(address(_pauseProxy));
            mods.pause = pause;
            pauseProxy = _pauseProxy;
        }

        // Deploy ESM
        {
            ESM esm = esmFab.newESM(gov, address(end), address(pauseProxy), min);
            end.rely(address(esm));
            vat.rely(address(esm));
            mods.esm = esm;
        }
    }

    function deployCollateralFlip(bytes32 ilk, address join, address pip) external auth {
        require(ilk != bytes32(""), "Missing ilk name");
        require(join != address(0), "Missing join address");
        require(pip != address(0), "Missing pip address");

        Vat vat = mods.vat;
        Cat cat = mods.cat;

        // Deploy Flip
        Flipper flip = flipFab.newFlip(address(this), address(vat), address(cat), ilk);
        ilks[ilk].flip = flip;
        ilks[ilk].join = join;
        Spotter(mods.spotter).file(ilk, "pip", address(pip)); // Set pip

        // Internal references set up
        cat.file(ilk, "flip", address(flip));
        vat.init(ilk);
        mods.jug.init(ilk);

        // Internal auth
        vat.rely(join);
        cat.rely(address(flip));
        flip.rely(address(cat));
        flip.rely(address(mods.end));
        flip.rely(address(mods.esm));
        flip.rely(address(pauseProxy));
    }

    function deployCollateralClip(bytes32 ilk, address join, address pip, address calc) external auth {
        require(ilk != bytes32(""), "Missing ilk name");
        require(join != address(0), "Missing join address");
        require(pip != address(0), "Missing pip address");
        require(calc != address(0), "Missing calc address");

        Vat vat = mods.vat;
        Dog dog = mods.dog;
        Spotter spotter = mods.spotter;

        // Deploy Clip
        Clipper clip = clipFab.newClip(address(this), address(vat), address(spotter), address(dog), ilk);
        ilks[ilk].clip = clip;
        ilks[ilk].join = join;
        Spotter(spotter).file(ilk, "pip", address(pip)); // Set pip

        // Internal references set up
        dog.file(ilk, "clip", address(clip));
        clip.file("vow", address(mods.vow));
        clip.file("calc", calc);
        vat.init(ilk);
        mods.jug.init(ilk);

        // Internal auth
        vat.rely(join);
        vat.rely(address(clip));
        dog.rely(address(clip));
        clip.rely(address(dog));
        clip.rely(address(mods.end));
        clip.rely(address(mods.esm));
        clip.rely(address(pauseProxy));
    }

    function releaseAuth() external auth {
        mods.vat.deny(address(this));
        mods.cat.deny(address(this));
        mods.dog.deny(address(this));
        mods.vow.deny(address(this));
        mods.jug.deny(address(this));
        mods.pot.deny(address(this));
        mods.dai.deny(address(this));
        mods.spotter.deny(address(this));
        mods.flap.deny(address(this));
        mods.flop.deny(address(this));
        mods.end.deny(address(this));
    }

    function releaseAuthFlip(bytes32 ilk) external auth {
        ilks[ilk].flip.deny(address(this));
    }

    function releaseAuthClip(bytes32 ilk) external auth {
        ilks[ilk].clip.deny(address(this));
    }
}
