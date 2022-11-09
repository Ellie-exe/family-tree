import express from 'express'
const router = express.Router();

import { OAuth2Client } from 'google-auth-library';
const CLIENT_ID = '740022531730-l28oie7e785fi8n676q35a6nns70lec1.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

import mongoose from 'mongoose'
await mongoose.connect('mongodb://127.0.0.1:27017/familyTreeDB');

import trees from '../modals/treeModal.js';
import users from '../modals/userModal.js';
import members from '../modals/memberModal.js';

router.get('/', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    users.findOne({ email: ticket.getPayload().email }, async (err, user) => {
        if (err) return res.sendStatus(500);

        await user.populate({ path: 'trees', populate: [{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]});
        res.json(user.trees);
    });
});

router.post('/', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    await trees.create({ name: req.body['name'] }, async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findOne({ email: ticket.getPayload().email }, async (err, user) => {
            if (err) return res.sendStatus(500);

            user.trees.push(tree._id);
            await user.save();

            await user.populate({ path: 'trees', populate: [{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]});
            res.json(user.trees);
        });
    });
});

router.post('/:treeID/members', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        await members.create({ name: req.body['name'] }, async (err, member) => {
            if (err) return res.sendStatus(500);

            tree.members.push(member._id);
            tree.numMembers++;
            tree.save();

            await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
            res.json(tree);
        });
    });
});

router.post('/:treeID/users', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    users.findOne({ email: req.params['email'] }, async (err, user) => {
        if (err) return res.sendStatus(500);

        trees.findById(req.params['treeID'], async (err, tree) => {
            if (err) return res.sendStatus(500);

            tree.users.push(user._id);
            await tree.save();

            user.trees.push(tree._id);
            await user.save();

            await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
            res.json(tree);
        });
    });
});

router.patch('/:treeID/users/:userID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findById(req.params['userID'], async (err, user) => {
            if (err) return res.sendStatus(500);

            // TODO: Implement filter once permissions are implemented

            res.sendStatus(200);
        });
    });
});

router.delete('/:treeID/users/:userID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        users.findById(req.params['userID'], async (err, user) => {
            if (err) return res.sendStatus(500);

            tree.users = tree.users.filter(user => user !== req.params['userID']);
            await tree.save();

            user.trees = user.trees.filter(tree => tree !== req.params['treeID']);
            await user.save();

            await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
            res.json(tree);
        });
    });
});

router.delete('/:treeID/members/:memberID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        members.findOneAndDelete({ _id: req.params['memberID'] }, async (err) => {
            if (err) return res.sendStatus(500);
        });

        tree.members = tree.members.filter(member => member !== req.params['memberID']);
        await tree.save();

        await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);
        res.json(tree);
    });
});

router.delete('/:treeID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    trees.findById(req.params['treeID'], async (err, tree) => {
        if (err) return res.sendStatus(500);

        await tree.populate([{ path: 'users' }, { path: 'members', populate: { path: 'fields' }}]);

        for (const user of tree.users) {
            user.trees = user.trees.filter(tree => tree !== req.params['treeID']);
            await user.save();
        }
    });

    trees.deleteOne({ _id: req.params['id'] }, (err) => {
        if (err) return res.sendStatus(500);
    });

    res.sendStatus(200);
});

export default router