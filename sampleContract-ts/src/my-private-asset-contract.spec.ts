/*
 * SPDX-License-Identifier: Apache-2.0
 */

 // tslint:disable: no-unused-expression
import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { MyPrivateAssetContract } from '.';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import crypto = require('crypto');
import * as sinon from 'sinon';
import * as sinonChai from 'sinon-chai';
import winston = require('winston');

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

class TestContext implements Context {
    public stub: sinon.SinonStubbedInstance<ChaincodeStub> = sinon.createStubInstance(ChaincodeStub);
    public clientIdentity: sinon.SinonStubbedInstance<ClientIdentity> = sinon.createStubInstance(ClientIdentity);
    public logging = {
        getLogger: sinon.stub().returns(sinon.createStubInstance(winston.createLogger().constructor)),
        setLevel: sinon.stub(),
    };
}

describe('MyPrivateAssetContract', () => {

    let contract: MyPrivateAssetContract;
    let ctx: TestContext;
    const myCollectionName: string = 'collectionOne';

    beforeEach(() => {
        contract = new MyPrivateAssetContract();
        ctx = new TestContext();
        ctx.stub.getPrivateData.withArgs(myCollectionName, '001').resolves(Buffer.from('{"privateValue":"150"}'));
    });

    describe('#myPrivateAssetExists', () => {

        it('should return true for a private asset that exists', async () => {
            await contract.myPrivateAssetExists(ctx, '001').should.eventually.be.true;
        });

        it('should return false for a private asset that does not exist', async () => {
            await contract.myPrivateAssetExists(ctx, '002').should.eventually.be.false;
        });

    });

    describe('#createMyPrivateAsset', () => {

        it('should throw an error for a private asset that already exists', async () => {
            await contract.createMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The private asset 001 already exists`);
        });

        it('should throw an error if transient data is not provided when creating private asset', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should throw an error if transient data key is not privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('prVal', Buffer.from('125'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should create a private asset if transient data key is privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('1500'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollectionName, '002', Buffer.from('{"privateValue":"1500"}'));
        });

    });

    describe('#readMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.readMyPrivateAsset(ctx, '003').should.be.rejectedWith('The private asset 003 does not exist');
        });

        it('should return my private asset', async () => {
            await contract.readMyPrivateAsset(ctx, '001').should.eventually.deep.equal({ privateValue: '150' });
            ctx.stub.getPrivateData.should.have.been.calledWithExactly(myCollectionName, '001');
        });

    });

    describe('#updateMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.updateMyPrivateAsset(ctx, '003').should.be.rejectedWith(`The private asset 003 does not exist`);
        });

        it('should throw an error if transient data is not provided when updating private asset', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

        it('should update my private asset if transient data key is privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('99'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollectionName, '001', Buffer.from('{"privateValue":"99"}'));
        });

        it('should throw an error if transient data key is not privateValue', async () => {
            const transientMap: Map<string, Buffer> = new Map<string, Buffer>();
            transientMap.set('prVal', Buffer.from('125'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The privateValue key was not specified in transient data. Please try again.`);
        });

    });

    describe('#deleteMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.deleteMyPrivateAsset(ctx, '003').should.be.rejectedWith('The private asset 003 does not exist');
        });

        it('should delete my private asset', async () => {
            await contract.deleteMyPrivateAsset(ctx, '001');
            ctx.stub.deletePrivateData.should.have.been.calledOnceWithExactly(myCollectionName, '001');
        });

    });

    describe('#verifyMyPrivateAsset', () => {

        it('should return true if hash calculated from object provided matches the hash of the private data', async () => {
            const privateObj: string = '{"privateValue":"125"}';
            const hashToVerify: string = crypto.createHash('sha256').update(privateObj).digest('hex');
            ctx.stub.getPrivateDataHash.resolves(Buffer.from(hashToVerify, 'hex'));
            const result: boolean = await contract.verifyMyPrivateAsset(ctx, '001', '{\"privateValue\":\"125\"}');
            result.should.equal(true);
        });

        it('should return false if hash calculated from object provided does not match the hash of the private data', async () => {
            ctx.stub.getPrivateDataHash.resolves(Buffer.from('someHash'));
            const result: boolean = await contract.verifyMyPrivateAsset(ctx, '001', 'someObject');
            result.should.equal(false);
        });

        it('should throw an error when user tries to verify an asset that doesnt exist', async () => {
            ctx.stub.getPrivateDataHash.resolves(Buffer.from(''));
            await contract.verifyMyPrivateAsset(ctx, '001', 'someObject').should.be.rejectedWith('No private data hash with the key: 001');
        });

    });

});
