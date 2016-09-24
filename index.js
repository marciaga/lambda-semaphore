var AWS = require('aws-sdk');
var twilio = require('twilio');

exports.handler = function(event, context) {
    console.log("JSON API from Semaphore: %j", event);

    AWS.config.apiVersions = {
        s3: '2006-03-01'
    }

    // My bucket with numbers.json is located in 'us-west-2' region
    var s3 = new AWS.S3({region: 'us-west-2'});
    // This is where you define bucket and a file for S3 to get
    var params = {Bucket: 'semaphore-lambda', Key: 'numbers.json'};

    s3.getObject(params, function(err, data) {
        if(err) console.log(err, err.stack); // an error has happened on AWS

        // Parse JSON file and put it in numbers variable
        try {
            var numbers = data.Body.toString('utf-8');
            manipulateNumbers(numbers);
        } catch (err) {
            console.log('Parse error: ', err);
        }

    });

    function manipulateNumbers(numbers) {
        // If someone breaks the master build on Semaphore, get inside the if statement
        if(event.branch_name == "master" && event.result == "failed") {
            // We get the name of a user who broke the build
            var blame = event.commit.author_name;

            // message that is sent to the developer who broke the master branch
            var message = "Congrats " + blame + ", you managed to break the master branch on SemaphoreCI!."

            twilioHandler(numbers, message);
        };
    };

    function twilioHandler(numbers, message) {
        numbers = JSON.parse(numbers);

        var blame_mail = event.commit.author_email;
        // twilio credentials
        var twilio_account_sid = numbers.twilio.twilio_account_sid;
        var twilio_auth_token = numbers.twilio.twilio_auth_token;
        var twilio_number = numbers.twilio.twilio_number;

        var client = twilio(twilio_account_sid, twilio_auth_token);

        // Send SMS
        client.sendSms({
            to: numbers[blame_mail],
            from: twilio_number,
            body: message
        }, function(err, responseData) { // this function is executed when a response is received from Twilio
            if (!err) {
                console.log(responseData);
                context.done(null, "Message sent to " + numbers[blame_mail] + "!");
            } else {
                console.log(err);
                context.done(null, "There was an error, message not sent!");
            }
        });
    };
}
