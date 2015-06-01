var fs = require('graceful-fs'),
    fse = require('graceful-fs-extra'),
    Q = require('q');

function average(avgTimes, fn) {
    return Q.Promise(function (resolve) {
        var timeAmount = 0, times = avgTimes - 1;
        var promise = fn();
        while (times--) {
            promise = promise.then(fn);
        }
        promise.done(function (data) {
            var time = data.time.sort();
            if (avgTimes > 2) {
                time.shift();
                time.pop();
            }
            console.log(data.name + ',' + (time.reduce(function (prev, curr) {
                return prev + curr;
            }) / (avgTimes - 2)).toFixed(2));
            resolve();
        });
    });
}

function syncTest(file, times, callback, data) {
    var startTime = new Date,
        deferred = Q.defer(),
        hasCallback = typeof callback == 'function',
        id = 'syncTest' + (hasCallback ? ' with callback' : '');
    while (times--) {
        var content = fs.readFileSync('test/' + file + '.js', 'utf-8');
        if (hasCallback) {
            content = callback(content);
        } else {
            data = callback;
        }
        fs.writeFileSync('tmp/' + file + id + '.js', content);
    }
    data = data || {time: []};
    data.time.push(new Date - startTime);
    data.name = id;
    deferred.resolve(data);
    return deferred.promise;
}

function asyncTest(file, times, callback, data) {
    var taskCount = times,
        startTime = new Date,
        deferred = Q.defer(),
        hasCallback = typeof callback == 'function',
        id = 'asyncTest' + (hasCallback ? ' with callback' : '');
    while (times--) {
        fs.readFile('test/' + file + '.js', {encoding: 'utf-8'}, function (err, content) {
            if (hasCallback) {
                content = callback(content);
            } else {
                data = callback;
            }
            fs.writeFile('tmp/' + file + id + '.js', content, function () {
                if (--taskCount == 0) {
                    data = data || {time: []};
                    data.time.push(new Date - startTime);
                    data.name = id;
                    deferred.resolve(data);
                }
            });
        });
    }
    return deferred.promise;
}

var through = require('through2'),
    split = require('split');

function streamTest(file, times, callback, data) {
    var startTime = new Date,
        taskCount = times,
        deferred = Q.defer(),
        hasCallback = typeof callback == 'function',
        id = 'streamTest' + (hasCallback ? ' with callback' : '');
    while (times--) {
        (function () {
            var stream = fs.createReadStream('test/' + file + '.js', {encoding: 'utf-8'});
            if (hasCallback) {
                stream = stream.pipe(through(function (line, encoding, next) {
                    line = callback(line.toString());
                    this.push(line + '\n');
                    next();
                }));
            } else {
                data = callback;
            }
            var writeStream = fs.createWriteStream('tmp/' + file + id + '.js');
            stream.pipe(writeStream);
            writeStream.on('finish', function () {
                if (--taskCount == 0) {
                    data = data || {time: []};
                    data.time.push(new Date - startTime);
                    data.name = id;
                    deferred.resolve(data);
                }
            });
        }());
    }
    return deferred.promise;
}
var REG = /jquery/gi;
function replaceJq(content) {
    return content.replace(REG, 'zepto');
}
function replaceJqByLine(content) {
    var arr = content.split('\n').map(function (line) {
        return line.replace(REG, 'zepto');
    });
    return arr.join('\n');
}
function clearDir() {
    if (!fs.existsSync('tmp/')) {
        fs.mkdirSync('tmp/');
    } else {
        fse.removeSync('tmp/*');
    }
}

function test(file, times, avgTimes) {
    avgTimes = avgTimes || 1;
    clearDir();

    console.log('\n=== ' + file + ' file == ' + times + ' times===');
    return Q.Promise(function (resolve) {
        average(avgTimes, syncTest.bind(null, file, times))
            .then(average.bind(null, avgTimes, asyncTest.bind(null, file, times)))
            .then(average.bind(null, avgTimes, streamTest.bind(null, file, times)))
            .then(average.bind(null, avgTimes, syncTest.bind(null, file, times, replaceJqByLine)))
            .then(average.bind(null, avgTimes, asyncTest.bind(null, file, times, replaceJqByLine)))
            .then(average.bind(null, avgTimes, streamTest.bind(null, file, times, replaceJq)))
            .done(resolve);
    });
}

var fileType = 'large';
//var fileType='small';
var avgTimes = 20
test(fileType, 1, avgTimes)
    .then(test.bind(null, fileType, 100, avgTimes))
    .then(test.bind(null, fileType, 1000, avgTimes))
    .then(test.bind(null, fileType, 5000, avgTimes))
    .done(clearDir);

test(fileType, 5000, avgTimes)
