var fs = require('fs');
var debugEnabled = false;
var maxLogFiles = 5;
var lastLogFile = '';
var logPath = './log/'

function start() {
    fs.mkdirSync(logPath, { recursive: true });
    cleanLogFiles();
}

function enableDebug() {
    debugEnabled = true;
}

function cleanLogFiles() {
    let file_list = [];
    fs.readdir(logPath, function (err, files) {
        if (err) return console.log(err);
        files.forEach(function (file) {
            var filePath = logPath + file;
            let result = fs.statSync(filePath);
            file_list.push({ path: filePath, date: result.ctime });
        });

        file_list.sort((a, b) => b.date - a.date);
        let counter = 0;
        file_list.forEach(file => {
            counter++;
            if (counter > maxLogFiles - 1) {
                // delete all older files
                fs.unlink(file.path, () => {});
            }
        });
    });
}

function getLogFile(date) {
    var name = logPath + date.getFullYear() + '.' + date.getMonth() + '.' + date.getDate() + '.log';
    if (lastLogFile !== name && lastLogFile !== '') {
        info('Cleaning log files');
        cleanLogFiles();
    }
    lastLogFile = name;
    return name;
}

function log(level, string) {
    let date = new Date();
    let str = date.toISOString() + level + string;
    console.log(str);
    fs.appendFile(getLogFile(date), str + '\n', 'utf8', () => { });
}

function info(string) {
    log('  INFO ', string);
}

function error(string) {
    log(' ERROR ', string);
}

function warn(string) {
    log('  WARN ', string);
}

function debug(string) {
    if (debugEnabled)
        log(' DEBUG ', string);
}

module.exports = { start, enableDebug, log, info, error, warn, debug };