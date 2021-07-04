#!/bin/bash

source .env

CHAIN_ID=3
GAS_LIMIT=12500000
FORK_URL='wss://ropsten.infura.io/ws/v3/'$INFURA_PROJECT_ID

BALANCE=100000000000000000000000

npx ganache-cli \
	--allowUnlimitedContractSize \
	-q \
	-h 0.0.0.0 \
	-i $CHAIN_ID \
	--chainId $CHAIN_ID \
	-l $GAS_LIMIT \
	-f $FORK_URL \
	--account $PRIVATE_KEY,$BALANCE
