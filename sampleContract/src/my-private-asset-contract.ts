/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { MyPrivateAsset } from './my-private-asset';
const myCollection: string = 'myCollection';

@Info({title: 'MyPrivateAssetContract', description: 'My Private Smart Contract' })
export class MyPrivateAssetContract extends Contract {

    @Transaction(false)
    @Returns('boolean')
    public async myPrivateAssetExists(ctx: Context, myPrivateAssetId: string): Promise<boolean> {
        const buffer = await ctx.stub.getPrivateData(myCollection, myPrivateAssetId);
        return (!!buffer && buffer.length > 0);
    }

    @Transaction()
    public async createMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (exists) {
            throw new Error(`The my asset ${myPrivateAssetId} already exists`);
        }

        const privateAsset: any = new MyPrivateAsset();

        const transientData = await ctx.stub.getTransient();
        if (!transientData) {
            throw new Error(`Transient data not supplied. Please try again.`);
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateAsset.privateValue = dataValue;
            }
        });

        await ctx.stub.putPrivateData(myCollection, myPrivateAssetId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction(false)
    @Returns('myPrivateAsset')
    public async readMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<string> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myPrivateAssetId} does not exist`);
        }
        let privateDataString: string;
        const privateData: Buffer = await ctx.stub.getPrivateData(myCollection, myPrivateAssetId);
        if (privateData.length > 0) {
            privateDataString = JSON.parse(privateData.toString());
            console.log('Private data retrieved from collection.');
            console.log(privateDataString);
        } else {
            console.log('No private data with the Key: ', myPrivateAssetId);
            return ('No private data with the Key: ' + myPrivateAssetId);
        }
        return privateDataString;
    }

    @Transaction()
    public async updateMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myPrivateAssetId} does not exist`);
        }

        const privateAsset: any = new MyPrivateAsset();

        const transientData = await ctx.stub.getTransient();
        if (!transientData) {
            throw new Error(`Transient data not supplied. Please try again.`);
        }

        // get the transient data and put values into the privateData object
        transientData.forEach((value, key) => {
            const dataValue: string = value.toString('utf8');
            if (key === 'privateValue') {
                privateAsset.privateValue = dataValue;
            }
        });

        await ctx.stub.putPrivateData(myCollection, myPrivateAssetId, Buffer.from(JSON.stringify(privateAsset)));
    }

    @Transaction()
    public async deleteMyPrivateAsset(ctx: Context, myPrivateAssetId: string): Promise<void> {
        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myPrivateAssetId} does not exist`);
        }
        await ctx.stub.deletePrivateData(myCollection, myPrivateAssetId);
    }

    @Transaction(false)
    public async verifyMyPrivateAsset(ctx: Context, collection: string, myPrivateAssetId: string, hashToVerify: string): Promise<string> {
        const org: string = ctx.clientIdentity.getMSPID();

        if (org !== 'Org2MSP') {
            throw new Error('Only the regulator can verify the asset.'); // Perhaps change message to `You can't verify your own asset`?
        }

        const exists = await this.myPrivateAssetExists(ctx, myPrivateAssetId);
        if (!exists) {
            throw new Error(`The my asset ${myPrivateAssetId} does not exist`);
        }

        const pdHashBytes: Buffer = await ctx.stub.getPrivateDataHash(collection, myPrivateAssetId);
        console.log(pdHashBytes);
        if (pdHashBytes.length > 0) {
            console.log(pdHashBytes);
            // got hash from the hash store
        } else {
            // hash doesn't exist with the given key
            throw new Error('No private data hash with that Key: ' + myPrivateAssetId);
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
