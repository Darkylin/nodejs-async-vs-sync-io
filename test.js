var fs = require('fs');

function syncTest(times, callback) {
    var startTime = new Date;
    while (times--) {
        var content = fs.readFileSync('test/jquery-1.11.3.js', 'utf-8');
        if(callback){
            content = callback(content);
        }
        fs.writeFileSync('test/jquery-1.11.3.copy.js', content);
    }
    console.log(new Date - startTime);
}

function asyncTest(times, callback) {
    var count = times, startTime = new Date;
    while (times--) {
        fs.readFile('test/jquery-1.11.3.js', {encoding: 'utf-8'}, function (err, content) {
            if(callback){
                content = callback(content);
            }
            fs.writeFile('test/jquery-1.11.3.copy.js', content, function () {
                if (--count == 0) {
                    console.log(new Date - startTime);
                }
            });
        });
    }
}
var REG = /jquery/gi;
function replaceJq(content){
    return content.replace(REG,'zepto');
}

//syncTest(1000);
//asyncTest(1000);

syncTest(1000,replaceJq);
asyncTest(1000,replaceJq);
