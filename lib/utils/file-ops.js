'use strict';

const fs = require('fs'),
    mime = require('mime-types'),
    pathUtil = require('path'),
    util = require('./filter');

module.exports = {

    getPath: function (req, path) {
        let accessPath = req.body.path.split('/');
        for (var k in accessPath) {
            path = path + '\\' + accessPath[k];
        }
        console.log('Location :', path);
        return path;
    },

    sendFileList: function (req, res, path) {
        try {
            fs.accessSync(path, fs.F_OK);
            fs.readdir(path, function (err, files) {
                let filesArr = util.getProperFiles(path, files);
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ 'path': path, 'files': filesArr }));
            });
        } catch (e) {
            throw e;
        }
    },

    streamFile: function (req, res, path) {
        let file = fs.readFileSync(path);
        let fileExtn = pathUtil.extname(path);
        console.log('File Extension :', fileExtn);

        switch (fileExtn) {
            case '.jpg':
            case '.jpeg':
                let base64data = new Buffer(file, 'binary').toString('base64');
                res.setHeader('Content-Type', 'application/json');
                res.writeHead(200, mime.contentType(path));
                res.end(JSON.stringify({ 'status': 'success', 'src': base64data, 'extn': fileExtn }));
                break;

            case '.txt':
            case '.js':
            case '.doc':
            case '.xls':
                res.setHeader('Content-Type', mime.contentType(path));
                res.sendFile(path);
                break;

            default:
                res.setHeader('Content-Type', mime.contentType(path));
                res.end(JSON.stringify({ 'status': 'error', 'src': 'file format not supported yet', 'extn': fileExtn }));
                break;
        }
    },

    streamMediaFile: function (req, res, fsPath, type) {
        let path = fsPath + '/' + req.query.path.replace(/pam3/g, '/'),
            range = req.headers.range,
            positions = range.replace(/bytes=/, "").split("-"),
            start = parseInt(positions[0], 10);

        try {
            fs.stat(path, function (err, stats) {
                let total = stats.size,
                    end = positions[1] ? parseInt(positions[1], 10) : total - 1,
                    chunksize = (end - start) + 1;

                res.writeHead(206, {
                    "Content-Range": "bytes " + start + "-" + end + "/" + total,
                    "Accept-Ranges": "bytes",
                    "Content-Length": chunksize,
                    "Content-Type": type
                });

                let stream = fs.createReadStream(path, { start: start, end: end })
                    .on("open", function () {
                        stream.pipe(res);
                    }).on("error", function (err) {
                        res.end(err);
                    });
            });
        } catch (err) {
            throw err;
        }
    }
}