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
    async initLedger (ctx) {
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
    async offer (ctx, contractId) {

        // initialize privateData object
        let privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            return 'Error: Transient data not supplied. Try again.';
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            let dataValue = new Buffer(value.toArrayBuffer()).toString();
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
    async readOffer (ctx, contractId) {
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
    async accept (ctx, contractId) {
        // initialize privateData object
        let privateData = {};

        // check whether transient data with buyer and offer price exists
        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {return 'Error: Transient data not supplied. Try again.';}

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            let dataValue = new Buffer(value.toArrayBuffer()).toString();
            if (key === 'acceptPrice') {privateData[key] = parseInt(dataValue);}
            if (key === 'privateBuyer') {privateData[key] = dataValue;}
            if (key === 'privatePrice') {privateData[key] = parseInt(dataValue);}
        });

        // update state of public ledger
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
    async readAccept (ctx, contractId) {
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
     * @param {String} contractId contractID
     * @param {String} hashvalue  the SHA256 hash string calculated from the source private data
    */

    // async crossVerifyWorldState(ctx, contractId, hashvalue) {

    //     // Method 1: CUSTOM calculate a SHA256 hash, of the offer data - supplied as a hash to this function)
    //     // eg. '{"privatebuyer":"DigiBank","privateprice":"9999"}' was written to the originator's own private collection state
    //     // eg. let actual_hash = crypto.createHash('sha256').update(data).digest("hex");
    //     // see 'offer' function - for info on the offer hash written to channel ledger - that's cross-checked in this CUSTOM method

    //     console.log('retrieving the hash of the buy transaction (fn: crossVerifyWorldState) in the world state' + contractId);

    //     // Get the 'channel hash' written (earlier) when the the 'offer' function was invoked -  get the valuefrom the world state
    //     let checkBytes = await ctx.stub.getState(contractId);
    //     let checkObj = JSON.parse(checkBytes);
    //     if (checkBytes.length > 0) {
    //         console.log('retrieved contract (crossVerifyWorldState function)');
    //         console.log(checkObj);
    //     } else {
    //         console.log('Nothing advertised with that Key: ', contractId);
    //         return ('EMPTY CONTRACT (crossVerifyWorldState function)');
    //     }
    //     if (hashvalue === checkObj.accept.offer.offerhash){
    //         return 'Hash matches!!: Calculated hash:  ' + hashvalue + '\n <----->  Hash from world state is ' + checkObj.accept.offer.offerhash;
    //     } else {
    //         return 'No match';
    //     }
    // }

}

module.exports = CarContract;
