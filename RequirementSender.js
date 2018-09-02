var express = require("express");
var request = require("request");
var fs = require("fs");
const rp = require("request-promise");

const app = express();

app.get("/sendRequirement/:productGuid", async function(req, res) {
  var product = getProduct(req.params.productGuid);
  await sendRequirement(product);
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

var sendRequirement = async function(product) {
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
        Cookie: await getCookie()
      },
      uri: "http://gp3.staging.keydisk.ru/create_demand",
      formData: formData,
      method: "POST"
    },
    async (err, res, body) => {
      //вытаскиваем ссыль на требование из ответа
      console.log(body);
      let response = JSON.parse(body);
      let url = response["url"];
      await sendToCore(url, product.guid);
    }
  );
};

var sendToCore = async function(reqUrl, productGuid) {
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
  var req = await request(
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

const getCookie = async () => {
  try {
    var responce = await rp({
      uri: "http://gp3.staging.keydisk.ru/login",
      method: "POST",
      resolveWithFullResponse: true,
      simple: false,
      form: {
        login: "evilivan",
        password: "oPaoPa225"
      }
    });

    const [setCookie] = responce.headers["set-cookie"];
    const parsedSetCookie = setCookie.match(/^(.*?);/);
    const [input, cookie] = parsedSetCookie;
    return cookie;
  } catch (e) {
    console.log("err", e);
    return null;
  }
};
