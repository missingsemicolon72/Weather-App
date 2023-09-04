const http = require('http');
const fs = require('fs');
const requests = require('requests');

const CITY_NAME = 'Vadodara';
const COUNTRY_CODE = 'IN';
const API_KEY = process.env.API_KEY;
const GEO_API_URL = `http://api.openweathermap.org/geo/1.0/direct?q=${CITY_NAME},${COUNTRY_CODE}&limit=1&appid=${API_KEY}`;
let tempData = '';

const server = http.createServer((req, res) => {
    if(req.url === '/'){
        tempData = '';
        requests(GEO_API_URL).on('data', (chunkData) => tempData += chunkData).on('end', () => {
            fetchWeather(tempData).then((weatherData) => {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(weatherData);
                res.end();
            }).catch((err) => {
                res.writeHead(404, { 'Content-Type': 'text/html' });
                res.write(`An error occured: ${err}`);
                res.end();
            });
        }).on('error', (err) => {
            res.writeHead(404, { 'Content-Type': 'text/html' });
            res.write(`An error occured: ${err}`);
            res.end();
        });
    }else{
        res.writeHead(404, { 'Content-Type': 'text/html' });
        res.write('Error 404: Page Not Found!');
        res.end();
    }
});

server.listen(8000, '127.0.0.1');

const fetchWeather = (strData) => {
    const objData = JSON.parse(strData);
    let fetch_error = '';
    let latt = -1;
    let long = -1;
    if(objData !== null && typeof objData === 'object' && objData.constructor === Object){
        fetch_error = objData.cod !== null ? objData.message : objData;
        return fetch_error;
    }else if(objData !== null && typeof objData === 'object' && Array.isArray(objData)){
        latt = objData[0].lat;
        long = objData[0].lon;
    }
    tempData = '';
    return new Promise((resolve, reject) => {
        const WEATHER_API_URL = `https://api.openweathermap.org/data/2.5/weather?lat=${latt}&lon=${long}&appid=${API_KEY}&units=metric`;
        requests(WEATHER_API_URL).on('data', (chunkData) => tempData += chunkData).on('end', () => {
            tempData = processWeatherData(tempData);
            resolve(tempData);
        }).on('error', (err) => reject(`An error occured: ${err}`));
    })
}

const processWeatherData = (weatherDataStr) => {
    const weatherDataArr = [JSON.parse(weatherDataStr)];
    if(weatherDataArr[0].cod === 200){
        const homeFile = fs.readFileSync('./index.html', 'utf-8');
        const realTimeData = weatherDataArr.map((val) => replaceVal(homeFile, val)).join("");
        return realTimeData;
    }
    return 'An error occured while processing the weather data!';
}

const replaceVal = (tempVal, orgVal) => {
    let temp = tempVal.replace('{%currenttemp%}', Math.round(orgVal.main.temp));
    temp = temp.replace('{%mintemp%}', Math.floor(orgVal.main.temp_min));
    temp = temp.replace('{%maxtemp%}', Math.ceil(orgVal.main.temp_max));
    temp = temp.replace('{%city%}', orgVal.name);
    temp = temp.replace('{%country%}', orgVal.sys.country);
    temp = temp.replace(/{%weathertype%}/g, orgVal.weather[0].main);
    return temp;
};