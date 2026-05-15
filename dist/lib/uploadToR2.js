"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToR2 = uploadToR2;
exports.createR2Client = createR2Client;
const node_fs_1 = require("node:fs");
const client_s3_1 = require("@aws-sdk/client-s3");
async function uploadToR2(params) {
    const { size } = (0, node_fs_1.statSync)(params.localPath);
    const cmd = new client_s3_1.PutObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
        Body: (0, node_fs_1.createReadStream)(params.localPath),
        ContentType: params.contentType ?? 'application/zip',
        ContentLength: size,
    });
    await params.client.send(cmd);
}
function createR2Client(opts) {
    return new client_s3_1.S3Client({
        region: 'auto',
        endpoint: `https://${opts.accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: opts.accessKeyId,
            secretAccessKey: opts.secretAccessKey,
        },
    });
}
