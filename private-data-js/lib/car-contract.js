/* eslint-disable no-unused-vars */
/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract, Context } = require('fabric-contract-api');
const CollectionBuyer = 'CollectionBuyer';
const CollectionSeller = 'CollectionSeller';

class CarContract extends Contract {

    /**
     *
     * @param {Context} ctx
     */
    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const cars = [
            {
                color: 'blue',
                make: 'Arium',
                model: 'Thanos'
            },
            {
                color: 'green',
                make: 'Arium',
                model: 'Thanos'
            },
            {
                color: 'red',
                make: 'Arium',
                model: 'Thanos'
            }
        ];

        for (let i = 0; i < cars.length; i++) {
            cars[i].docType = 'car';
            await ctx.stub.putState('CAR' + i, Buffer.from(JSON.stringify(cars[i])));
            console.info('Added <--> ', cars[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} carId
     */
    async carExists(ctx, carId) {
        const buffer = await ctx.stub.getState(carId);
        return (!!buffer && buffer.length > 0);
    }

    /**
     *
     * @param {Context} ctx the transaction context
     * @param {String} contractId the contract ID
     * @param {String} seller seller organization
     * @param {String} carId car ID
     * @param {Integer} advertizedPrice seller price
     * @param {String} advertizedDate advertized
     */
    async advertize(ctx, contractId, seller, carId, advertizedPrice, advertizedDate) {
        // check whether car exists, error if car doesn't exist
        const exists = await this.carExists(ctx, carId);
        if (!exists) {
            throw new Error(`The car ${carId} does not exist`);
        }

        // advertize cars in the public ledger
        const carTrade = {
            contractID: contractId,
            seller: seller,
            carId: carId,
            advertizedPrice: advertizedPrice,
            advertizedDate: advertizedDate
        };

        // update ledger to show status of car transaction to be advertized

        // without asset and name space
        await ctx.stub.putState(contractId, Buffer.from(JSON.stringify(carTrade)));

        // return advertize arguments to the terminal
        return JSON.stringify(carTrade);
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} contractId
     */
    async offer(ctx, contractId) {

        // initialize privateData object
        let privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return 'Error: Transient data not supplied. Try again.';
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            // let dataValue = new Buffer(value.toArrayBuffer()).toString();
            let dataValue = value.toString('utf8');
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue);
            }
        });

        // update state of public ledger

        // putPrivateData based on the collection definition for buyer organization and privateData object
        await ctx.stub.putPrivateData(CollectionBuyer, contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} contractId
     */
    async readOffer(ctx, contractId) {
        let privateDataString;
        const privateData = await ctx.stub.getPrivateData(CollectionBuyer, contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData);
            console.log('Private data retrieved from collection.');
            console.log(privateDataString);
        }
        else {
            console.log('No private data with the Key: ', contractId);
            return 'No private data with the Key: ' + contractId;
        }
        return privateDataString;
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} contractId
     */
    async accept(ctx, contractId) {
        // initialize privateData object
        let privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) { return 'Error: Transient data not supplied. Try again.'; }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            let dataValue = value.toString('utf8');
            if (key === 'acceptPrice') {
                privateData[key] = parseInt(dataValue);
            }
            if (key === 'privateBuyer') {
                privateData[key] = dataValue;
            }
            if (key === 'privatePrice') {
                privateData[key] = parseInt(dataValue);
            }
        });

        // putPrivateData based on the collection definition for buyer organization and privateData object
        await ctx.stub.putPrivateData(CollectionSeller, contractId, Buffer.from(JSON.stringify(privateData)));

        // return transient data to the terminal
        return JSON.stringify(privateData);
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} contractId
     */
    async readAccept(ctx, contractId) {
        let privateDataString;
        const privateData = await ctx.stub.getPrivateData(CollectionSeller, contractId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData);
            console.log('Private data retrieved from collection.');
            console.log(privateDataString);
        }
        else {
            console.log('No private data with the Key: ', contractId);
            return 'No private data with the Key: ' + contractId;
        }
        return privateDataString;
    }

    /**
     * CUSTOM: OPTIONAL LAB: Cross verify the channel hash of the offer data, against what the seller's bank sees - see if they match
     * @param {Context} ctx the transaction context
     * @param {String} collection  the collection name - this function can be called by a regulator, calling different collections etc.
     * @param {String} contractId contractID
     * @param {String} hashToVerify  the SHA256 hash string calculated from the source private data to compare against the hash store
     */

    async verifyPrivateData(ctx, collection, contractId, hashToVerify) {
        console.log('retrieving the hash from the PDC hash store of the buy transaction (fn: crossVerify)' + contractId);

        let pdHashBytes = await ctx.stub.getPrivateDataHash(collection, contractId);

        if (pdHashBytes.length > 0) {
            // got hash from the hash store
            console.log('retrieved private data hash from collection');
        }
        else {
            // hash doesn't exist with the given key
            console.log('No private data hash with that Key: ', contractId);
            return 'No private data hash with that Key: ' + contractId;
        }

        //  retrieve SHA256 hash of the converted Byte array -> string from private data collection's hash store (DB)
        let actual_hash = pdHashBytes.toString('hex');

        // Get the 'channel hash' written in the 'offer' function - from the world state
        let acceptBytes = await ctx.stub.getState(contractId);
        if (acceptBytes.length > 0) {
            var verify = JSON.parse(acceptBytes);
            console.log('retrieved contract (verifyPrivateData)');
            console.log(verify);
        }
        else {
            console.log('Nothing advertised with that Key: ', contractId);
            var verify = "EMPTY CONTRACT (verifyPrivateData function)";
            return verify;
        }
        if (hashToVerify === actual_hash) {
            let accept = verify.accept;
            // update the status - on the world state
            await ctx.stub.putState(contractId, Buffer.from(JSON.stringify({ accept })));
            return '\nCalculated Hash provided: \n' + hashToVerify + '\n\n             MATCHES  <----->  \n\nHash from Private Data Hash State \n' + actual_hash;
        } else {
            return 'Could not match the Private Data Hash State: ' + actual_hash;
        }
    }

}

module.exports = CarContract;
