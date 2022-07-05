// Import express module
const express = require("express");

// Instantiate App
const app = express();

// Add Middleware to parse body to JSON
app.use(express.json());

// Health Controller
app.get("/", (req, res) => {
  res.status(200).send({ message: "Online" });
});

// Transaction Controller
app.post("/split-payments/compute", (req, res) => {
  const transaction = req.body;
  if (!transaction) {
    return res.status(400).send({
      message: "Bad request, no transaction object in request body",
    });
  }
  if (transaction.SplitInfo.length > 20 || transaction.SplitInfo.length < 1) {
    return res.status(400).send({
      message:
        "Bad request, splitInfo array must contain a minimum of 1 split entity and a maximum of 20 entities",
    });
  }

  let flats = [];
  let percentages = [];
  let ratios = [];
  let ratioSum = 0;

  for (let info of transaction.SplitInfo) {
    if (info.SplitValue < 0) {
      return res
        .status(400)
        .send("Bad request, SplitValue cannot be less than zero");
    }
    if (info.SplitType === "FLAT") {
      flats.push(info);
    } else if (info.SplitType === "PERCENTAGE") {
      percentages.push(info);
    } else if (info.SplitType === "RATIO") {
      ratioSum += info.SplitValue;
      ratios.push(info);
    }
  }

  let response = {
    ID: transaction.ID,
    Balance: transaction.Amount,
    SplitBreakdown: [],
  };

  for (let flat of flats) {
    let flatResponse = {
      SplitEntityId: flat.SplitEntityId,
      Amount: flat.SplitValue,
    };
    response.SplitBreakdown.push(flatResponse);
    response.Balance -= flatResponse.Amount;
    if (response.Balance < 0) {
      return res
        .status(400)
        .send("Bad request, balance cannot be less than zero");
    }
  }

  for (let percentage of percentages) {
    let percentageResponse = {
      SplitEntityId: percentage.SplitEntityId,
      Amount: (percentage.SplitValue * response.Balance) / 100,
    };
    response.SplitBreakdown.push(percentageResponse);
    response.Balance -= percentageResponse.Amount;
    if (response.Balance < 0) {
      return res
        .status(400)
        .send("Bad request, balance cannot be less than zero");
    }
  }

  let ratioBalance = response.Balance;

  for (let ratio of ratios) {
    let ratioResponse = {
      SplitEntityId: ratio.SplitEntityId,
      Amount: (ratio.SplitValue * ratioBalance) / ratioSum,
    };
    response.SplitBreakdown.push(ratioResponse);
    response.Balance -= ratioResponse.Amount;
    if (response.Balance < 0) {
      return res
        .status(400)
        .send("Bad request, balance cannot be less than zero");
    }
  }

  res.status(200).send(response);
});

const port = process.env.REST_PORT || 3000;

app.listen(port, () => console.log(`Server running on port ${port}`));
