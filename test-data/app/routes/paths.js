const express = require('express');
const router = express.Router();
const multer = require("multer")();

const model = require('../models.js');

router.get("/jquery.js", (req, res, next) => {
	res.sendFile("jquery.js", {'root': 'node_modules/jquery/dist/'});
});
router.get("/limberjax.js", (req, res, next) => {
	res.sendFile("limberjax.js", {'root': 'src/'});
});
router.get("/link-updater.js", (req, res, next) => {
	res.sendFile("link-updater.js", {'root': 'test-data/app/scripts/'});
});

router.get("/*", (req, res, next) => {
	const path = req.url;
	let renderObject = {
		title: path,
		path: path,
		limberjax: req.query.limberjax
	};
	res.render('paths/path.html', renderObject);
});
router.post("/*", multer.any(), (req, res, next) => {
	const path = req.url;
	let form_data = "";
	for (let field in req.body) {
		form_data += field + ":" + req.body[field] + ";";
	}
	req.files.forEach(function (file) {
		form_data += file.fieldname + ":" +
			file.originalname + "|" +
			file.encoding + "|" +
			file.mimetype + "|" +
			file.size + ";";
	});
	const renderObject = {
		title: path,
		path: path,
		limberjax: req.query.limberjax,
		form_data: form_data
	};
	res.render('paths/path.html', renderObject);
});

module.exports = router;
