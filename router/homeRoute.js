const express = require("express");

const router = express.Router();

router.get("/", (req, res) => {
  res.send(
    "<form action='/message' method='POST'><input type='text' name='username'/><button type='submit'>send</button></form>",
  );
});

module.exports = router;
