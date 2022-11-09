import express from 'express'
const router = express.Router();

import { OAuth2Client } from 'google-auth-library';
const CLIENT_ID = '740022531730-l28oie7e785fi8n676q35a6nns70lec1.apps.googleusercontent.com';
const client = new OAuth2Client(CLIENT_ID);

import mongoose from 'mongoose'
await mongoose.connect('mongodb://127.0.0.1:27017/familyTreeDB');

import members from '../modals/memberModal.js';
import fields from '../modals/fieldModal.js';

router.get('/:memberID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    members.findById(req.params['memberID'], (err, member) => {
        if (err) return res.sendStatus(500);
        res.json(member);
    });
});

router.post('/:memberID/fields', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    await fields.create({ name: req.body['name'], value: req.body['value'] }, async (err, field) => {
        if (err) return res.sendStatus(500);

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            member.fields.push(field._id);
            await member.save();

            await member.populate({ path: 'fields' });
            res.json(member);
        });
    });
});

router.patch('/:memberID/fields/:fieldID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    fields.findById(req.params['fieldID'], async (err, field) => {
        if (err) return res.sendStatus(500);

        field.name = req.body['name'];
        field.value = req.body['value'];
        await field.save();

        members.findById(req.params['memberID'], async (err, member) => {
            if (err) return res.sendStatus(500);

            await member.populate({ path: 'fields' });
            res.json(member);
        });
    });
});

router.delete('/:memberID/fields/:fieldID', async (req, res) => {
    const ticket = await client.verifyIdToken({
        idToken: req.headers['authorization'].split(' ')[1],
        audience: CLIENT_ID
    });

    if (!ticket) return res.sendStatus(401);

    fields.findOneAndDelete({ _id: req.params['fieldID'] }, async (err) => {
        if (err) return res.sendStatus(500);
    });

    members.findById(req.params['memberID'], async (err, member) => {
        if (err) return res.sendStatus(500);

        member.fields = member.fields.filter(field => field !== req.params['fieldID']);

        await member.populate({ path: 'fields' });
        res.json(member);
    });
});

export default router