/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context } from 'fabric-contract-api';
import { ChaincodeStub, ClientIdentity } from 'fabric-shim';
import { MyPrivateAssetContract } from '.';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
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
    const myCollection: string = 'myCollection';

    beforeEach(() => {
        contract = new MyPrivateAssetContract();
        ctx = new TestContext();
        ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
    });

    describe('#MyPrivateAssetExists', () => {

        it('should return true for a private asset that exists', async () => {
            await contract.myPrivateAssetExists(ctx, '001').should.eventually.be.true;
        });

        it('should return false for a private asset that does not exist', async () => {
            await contract.myPrivateAssetExists(ctx, '002').should.eventually.be.false;
        });

    });

    describe('#createMyPrivateAsset', () => {

        it('should throw an error for a private asset that already exists', async () => {
            await contract.createMyPrivateAsset(ctx, '001').should.be.rejectedWith(`The my asset 001 already exists`);
        });

        it('should throw an error if transient data is not provided when creating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.createMyPrivateAsset(ctx, '002').should.be.rejectedWith(`Transient data not supplied. Please try again.`);
        });

        it('should create a private asset', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('1500'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.createMyPrivateAsset(ctx, '002');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '002', Buffer.from('{"privateValue":"1500"}'));
        });

    });

    describe('#readMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.readMyPrivateAsset(ctx, '003').should.be.rejectedWith('The my asset 003 does not exist');
        });

        it('should return my private asset', async () => {
            await contract.readMyPrivateAsset(ctx, '001').should.eventually.deep.equal({ privateValue: '150' });
            ctx.stub.getPrivateData.should.have.been.calledWithExactly(myCollection, '001');
        });

    });

    describe('#updateMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.updateMyPrivateAsset(ctx, '003').should.be.rejectedWith(`The my asset 003 does not exist`);
        });

        it('should throw an error if transient data is not provided when updating private asset', async () => {
            ctx.stub.getTransient.resolves(undefined);
            await contract.updateMyPrivateAsset(ctx, '001').should.be.rejectedWith(`Transient data not supplied. Please try again.`);
        });

        it('should update my private asset', async () => {
            const transientMap = new Map<string, Buffer>();
            transientMap.set('privateValue', Buffer.from('99'));
            ctx.stub.getTransient.resolves(transientMap);
            await contract.updateMyPrivateAsset(ctx, '001');
            ctx.stub.putPrivateData.should.have.been.calledOnceWithExactly(myCollection, '001', Buffer.from('{"privateValue":"99"}'));
        });

    });

    describe('#deleteMyPrivateAsset', () => {

        it('should throw an error for my private asset that does not exist', async () => {
            await contract.deleteMyPrivateAsset(ctx, '003').should.be.rejectedWith('The my asset 003 does not exist');
        });

        it('should delete my private asset', async () => {
            await contract.deleteMyPrivateAsset(ctx, '001');
            ctx.stub.deletePrivateData.should.have.been.calledOnceWithExactly(myCollection, '001');
        });

    });

    describe('#verifyMyPrivateAsset', () => {

        // const mspStub = sinon.stub(ctx.clientIdentity, 'getMSPID').resolves('ecobankMSP');
        it('should error if an org that does not have permission to verify tries the private asset to verify the private asset', async () => {
            await contract.verifyMyPrivateAsset(ctx, myCollection, '001', 'xyz').should.be.rejectedWith('Only the regulator can verify the asset.');
            // tslint:disable-next-line: no-unused-expression
            ctx.stub.getPrivateDataHash.should.not.have.been.called;
        });

        it('should throw an error for my private asset that does not exist', async () => {
            ctx.clientIdentity.getMSPID.returns('ecobankMSP');
            await contract.verifyMyPrivateAsset(ctx, myCollection, '003', 'xyz').should.be.rejectedWith('The my asset 003 does not exist');
        });

        it('should return success message if hash provided matches the hash of the private data', async () => {
            ctx.clientIdentity.getMSPID.returns('ecobankMSP');
            ctx.stub.getPrivateDataHash.resolves(Buffer.from('xyz'));
            ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
            await contract.verifyMyPrivateAsset(ctx, myCollection, '001', '78797a');
        });

        it('should throw an error if hash provided does not match the hash of the private data', async () => {
            ctx.clientIdentity.getMSPID.returns('ecobankMSP');
            ctx.stub.getPrivateDataHash.resolves(Buffer.from('xyz'));
            ctx.stub.getPrivateData.withArgs(myCollection, '001').resolves(Buffer.from('{"privateValue":"150"}'));
            await contract.verifyMyPrivateAsset(ctx, myCollection, '001', 'xyz').should.be.rejectedWith('Could not match the Private Data Hash State: 78797a');
        });

    });

});
