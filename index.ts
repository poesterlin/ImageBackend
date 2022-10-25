
import express, { Request } from "express";
import sharp, { FormatEnum } from "sharp";
import fs from "fs/promises";
import { join } from "node:path";
import crypto from "node:crypto";

import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import FileMiddleware from "./upload";

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

const mediaFolder = join(__dirname, "./media");
const storeFormat = "webp";
const storeExtension = "." + storeFormat;

interface IQuery {
    w: string,
    h: string,
    format: keyof FormatEnum,
}

interface IParams {
    folder: string,
    id: string,
}

app.get("/images/:folder/:id", async (req: Request<IParams, {}, {}, IQuery>, res) => {
    const width = req.query.w;
    const height = req.query.h;
    const format = req.query.format;

    const id = req.params.id;
    const folder = req.params.folder;

    if (folder.includes(".")) {
        return res.json({ message: "access not allowed" }).send(401);
    }

    const path = join(mediaFolder, folder, id + storeExtension);

    if (!(await exists(path))) {
        return res.send(404);
    }

    let s = sharp(path);

    if (width !== undefined || height !== undefined) {
        const h = parseInt(height);
        const w = parseInt(width);

        // const {width, height} = await s.metadata();

        // fix sizing

        s = s.resize(isNaN(w) ? undefined : w, isNaN(h) ? undefined : h, {
            withoutEnlargement: true,
        });

    }

    if (format) {
        s = s.toFormat(format);
    }

    res.end(await s.toBuffer());
});

app.get("/images/:folder", async (req, res) => {
    const folder = req.params.folder;

    if (folder.includes(".")) {
        return res.json({ message: "access not allowed" }).sendStatus(401);
    }

    const content = await fs.readdir(join(mediaFolder, folder));

    return res.json({ content: content.map(c => c.replace(storeExtension, "")) });
});

app.post('/upload/:folder', FileMiddleware.memoryLoader.single('image'), async (req: any, res) => {

    const folder = req.params.folder;

    if (folder.includes(".")) {
        return res.json({ message: "access not allowed" }).send(401);
    }

    const path = join(mediaFolder, folder);

    if (!(await exists(path))) {
        return res.send(400);
    }

    const id = crypto.randomUUID();
    await sharp(req.file.buffer)
        .resize({
            width: 3000,
            withoutEnlargement: true,
        })
        .toFormat(storeFormat, {
            quality: 95
        })
        .toFile(join(path, id + storeExtension));

    res.send({ id });
});

app.get('/folders/new', async (_req, res) => {
    const id = crypto.randomUUID();
    await fs.mkdir(join(mediaFolder, id))
    res.send({ id })
});

app.get('/folders', async (_req, res) => {
    const content = await fs.readdir(mediaFolder)
    return res.json({ content });
});

app.get('/', function (req, res) {
    res.sendFile(join(__dirname, '/index.html'));
});

app.get("/folders/clear/:folder", async (req: Request<IParams, {}, {}, {}>, res) => {
    const folder = req.params.folder;

    if (folder.includes(".")) {
        return res.json({ message: "access not allowed" }).send(401);
    }

    const path = join(mediaFolder, folder);

    if (!(await exists(path))) {
        return res.send(400);
    }

    await fs.rm(join(mediaFolder, folder), { recursive: true, force: true });
    res.send(200);
});
app.get("/folders/clear", async (req: Request<IParams, {}, {}, {}>, res) => {
    await fs.rm(mediaFolder, { recursive: true, force: true });
    await fs.mkdir(mediaFolder);
    res.send(200);
});

function exists(path: string) {
    return fs.access(path).then(() => true).catch(() => false);
}

app.listen(process.env.PORT ?? 3000);