/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
const sampleCollection: string = 'sampleCollection';

@Info({title: 'MyAssetContract', description: 'My Smart Contract' })
export class MyAssetContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async myAssetExists(ctx: Context, myAssetId: string): Promise<boolean> {
        const buffer = await ctx.stub.getPrivateData(sampleCollection, myAssetId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    public async createMyAsset(ctx: Context, myAssetId: string): Promise<void> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (exists) {
            throw new Error(`The my asset ${myAssetId} already exists`);
        }

        const privateData: any = {};

        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            throw new Error(`Transient data not supplied. Try again.`);
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateData[key] = dataValue;
            }
        });

        await ctx.stub.putPrivateData(sampleCollection, myAssetId, Buffer.from(JSON.stringify(privateData)));
    }

    @Transaction(false)
    @Returns('MyAsset')
    public async readMyAsset(ctx: Context, myAssetId: string): Promise<string> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        let privateDataString: string;
        const privateData: Buffer = await ctx.stub.getPrivateData(sampleCollection, myAssetId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData.toString());
            console.log('Private data retrieved from collection.');
            console.log(privateDataString);
        } else {
            console.log('No private data with the Key: ', myAssetId);
            return ('No private data with the Key: ' + myAssetId);
        }
        return privateDataString;
    }

    @Transaction()
    public async updateMyAsset(ctx: Context, myAssetId: string): Promise<void> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }

        const privateData: any = {};

        const transientData = ctx.stub.getTransient();
        if (transientData.size === 0) {
            throw new Error(`Transient data not supplied. Try again.`);
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateData[key] = dataValue;
            }
        });

        await ctx.stub.putPrivateData(sampleCollection, myAssetId, Buffer.from(JSON.stringify(privateData)));
    }

    @Transaction()
    public async deleteMyAsset(ctx: Context, myAssetId: string, collection: string): Promise<void> {
        const exists = await this.myAssetExists(ctx, myAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myAssetId} does not exist`);
        }
        await ctx.stub.deletePrivateData(collection, myAssetId);
    }

    @Transaction(false)
    public async verifyAsset(ctx: Context, collection: string, myAssetId: string, hashToVerify: string): Promise<string> {
        const org: string = ctx.clientIdentity.getMSPID();

        if (org !== 'ecobankMSP') {
            throw new Error('Only the regulator can verify the asset.'); // Perhaps change message to `You can't verify your own asset`?
        }

        const pdHashBytes: Buffer = await ctx.stub.getPrivateDataHash(collection, myAssetId);
        if (pdHashBytes.length > 0) {
            // got hash from the hash store
        } else {
            // hash doesn't exist with the given key
            throw new Error('No private data hash with that Key: ' + myAssetId);
        }

        //  retrieve SHA256 hash of the converted Byte array -> string from private data collection's hash store (DB)
        const actualHash: string = pdHashBytes.toString('hex');

        if (hashToVerify === actualHash) {
            // verify successful
            return '\nCalculated Hash provided: \n' + hashToVerify + '\n\n             MATCHES  <----->  \n\nHash from Private Data Hash State \n' + actualHash;
        } else {
            throw new Error('Could not match the Private Data Hash State: ' + actualHash);
        }
    }

}
