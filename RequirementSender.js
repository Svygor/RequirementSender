var express = require("express");
var request = require("request");
var FormData = require("form-data");
var fs = require("fs");
var path = require("path");

const app = express();
var cookies =
  ".eJyrVkrLzFeyUoopNTAxMgCRxqlgMhlMgkVMLJDEjRRAlGEaQtrYCEyagskkJR2lzBSggUX5uYnFGfllQH5OYnFJfE5-emaeklW1kgJI1q0oU0fB2FDBsTRdwcjA0ELBwMLKxMjK0FTB3TdEqVZHqTi1qCwzORWotCQVqNs9wFipFgCGLTEc.Dmpmtw.CSZCzjflefwYDXOjiaxSkJnr13s";

app.get("/sendRequirement/:productGuid", function(req, res) {
  var product = getProduct(req.params.productGuid);
  sendRequirement(product);
  res.send("Требование отправлено!");
});

app.listen(1414, function() {
  console.log("app listening on port 1414!");
});

var getProduct = function(productGuid) {
  var result;
  switch (productGuid) {
    case "05cc6eff-76e6-4ddc-9c90-833f8a7fc0bd":
      result = {
        guid: "05cc6eff-76e6-4ddc-9c90-833f8a7fc0bd",
        inn: "9666223729",
        kpp: "999901001",
        name: "_тест_ ООО Летающая тарелка"
      };
      break;
    case "71a6fc6d-b0a7-45ec-9301-ede35287129b":
      result = {
        guid: "71a6fc6d-b0a7-45ec-9301-ede35287129b",
        inn: "9620167038",
        kpp: "999901001",
        name: "_тест_ ЗАО Зимний лес"
      };
      break;
    case "53030261-2d81-4d88-a50d-43f61c79af16":
      result = {
        guid: "53030261-2d81-4d88-a50d-43f61c79af16",
        inn: "9651322558",
        kpp: "999901001",
        name: "_тест_ ПФР в массы"
      };
  }
  return result;
};

var sendRequirement = function(product) {
  var isLoginNeeded = isCookiesValid(cookies);
  if (isLoginNeeded) {
    cookies = login();
  }
  //считываем PDF-ку, которую будем слать
  const file = fs.readFileSync("./RequirementFiles/123.pdf");

  //тело для запроса генерации требования
  var formData = {
    taxation: "9999",
    inn: product.inn,
    kpp: product.kpp,
    name: product.name,
    guid: product.guid,
    files: [
      {
        value: file,
        options: {
          filename: "topsecret.pdf",
          contentType: "application/pdf"
        }
      }
    ],
    KND_0: "1165050"
  };

  //запрашиваем требование
  var r = request(
    {
      headers: {
        //TODO: нужно придумать, как авторизовываться
        Cookie:
          "session=.eJyrVkrLzFeyUoopNTAxMgCRxqlgMhlMgkVMLJDEjRRAlGEaQtrYCEyagskkJR2lzBSggUX5uYnFGfllQH5OYnFJfE5-emaeklW1kgJI1q0oU0fB2FDBsTRdwcjA0ELBwMLKxMjK0FTB3TdEqVZHqTi1qCwzORWotCQVqNs9wFipFgCGLTEc.Dmpmtw.CSZCzjflefwYDXOjiaxSkJnr13s"
      },
      uri: "http://31.13.60.76:8000/create_demand",
      formData: formData,
      method: "POST"
    },
    (err, res, body) => {
      //вытаскиваем ссыль на требование из ответа
      let response = JSON.parse(body);
      let url = response["url"];
      sendToCore(url, product.guid);
    }
  );
};

var sendToCore = function(reqUrl, productGuid) {
  //тело запроса для запуливания требования в ядро
  var coreFormData = {
    directionType: "Fns",
    AbonentId: productGuid,
    file: {
      value: request.get(reqUrl),
      options: {
        filename: "topsecret.zip",
        contentType: "application/x-zip-compressed"
      }
    }
  };

  //запуливание требования в ядро
  var req = request(
    {
      uri: "http://kube-staging.astralnalog.ru:32038/uploadFile",
      formData: coreFormData,
      method: "POST"
    },
    (err, res) => {
      //console.log(res.statusCode);
      //console.log(res.body);
    }
  );
};

var login = function() {
  //тело запроса для логина
  var loginFormData = {
    login: "romashov",
    password: "66LjzNreZue",
    submit: "Войти"
  };
  var req = request(
    {
      uri: "http://31.13.60.76:8000/login",
      formData: loginFormData,
      method: "POST"
    },
    (err, res) => {
      //console.log(err);
      //console.log(res.Cookie);
      return res;
    }
  );
};

var isCookiesValid = function(cookies) {
  request(
    {
      headers: {
        Cookie: "session=" + cookies
      },
      uri: "http://31.13.60.76:8000/create_demand",
      method: "GET"
    },
    (err, res) => {
      console.log(res);
      if (res.statusCode == 200) return false;
      else return true;
    }
  );

  //console.log(req);
};
