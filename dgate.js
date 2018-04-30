var mysql = require('mysql');
var SerialPort = require('serialport');
var http = require('http');
var Readline = SerialPort.parsers.Readline;
var serialPort = new SerialPort('/dev/serial0', {baudRate: 9600});
var currentEid = "";
var parser = new Readline();
var con = mysql.createConnection({
	host: "localhost",
	user: "root",
	password: "password",
	database: "dgate1"
});
serialPort.pipe(parser);


console.log("Starting manual draft server.");
http.createServer(function(req, res){
    	if (req.method == 'POST'){
        	var body = '';
        	req.on('data', function (data) {
           		body += data;
        	});
		req.on('end', function(){
			console.log("Manual draft");
			console.log("-------------------------------------");
			serialPort.write("MANUALDRAFT:"+body+"\n", function(err){
                        	if(err)throw err;
                	});
		});
        	res.writeHead(200, {'Content-Type':'text/json'});
       		res.end(body);
    	}
}).listen(8080);


//Eartag scanning section
//serialPort.pipe(parser);
parser.on('data', function(data){
	//Sanitize input
	data = data.replace(/[^a-zA-Z\d:]/gi, '');
  	//console.log('data received: ' + data);
	//EID recieved
	if(data.substring(0, 4) == "EID:"){
		currentEid = data.substring("EID:".length).replace(/\D/g, '');;
		console.log("Recieved EID: "+currentEid);
		//Query database for animal
		con.query("SELECT * FROM animal "+
				"LEFT JOIN draft ON (draft.animalKey = animal.animalKey) "+
				"WHERE eid='"+currentEid+"'", function(err, row){
			if(err)throw err;
			if(row.length>0){
				console.log("Cow scanned:\n"+
				(row[0].managementID ? "ManagementID: "+row[0].managementID+"\n":'')+
				(row[0].birthID ? "BirthID: "+row[0].birthID+"\n":"")+
				(row[0].eid ? "EID: "+row[0].eid:""));
				//Check for drafting information
				if(row[0].draftID){
					console.log("Draft Direction: "+row[0].draftDirection);
                			serialPort.write("DRAFT:"+row[0].draftDirection+"\n", function(err){
						if(err)throw err;
					});

				}else{
					//Correct gate if no drafting information
                                        serialPort.write("DRAFT:straight\n", function(err){
                                                if(err)throw err;
                                        });
				}
			}else{
				console.log("Cow not in the system");
                                serialPort.write("DRAFT:straight\n", function(err){
                                	if(err)throw err;
                             	});
			}
			console.log("-------------------------------------");
		});
	}






	if(data=="testmessage"){
		serialPort.write('I got the test message\n', function(err){
			if(err){
				return console.log('Error on write: ', err.message);
			}
		});
	}
});

serialPort.on('open', function(){
  	console.log('Established Serial Coms.');
});
