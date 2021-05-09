'use strict';
const path = require('path')
const escpos = require('escpos')
escpos.USB = require('escpos-usb')

const device = new escpos.USB();
const options = { encoding: "ISO-8859-2" }
const printer = new escpos.Printer(device, options)

var bodyParser = require('body-parser')
var app = require('express')()
var http = require('http').Server(app)
var cors = require('cors')
app.use(cors())
app.use(bodyParser.json())

const port = 4000;

app.post('/print', (req, res) => {
    res.json(
        { status: 'success' }
    )
    console.log(req.body);

    const { order } = req.body;


    const pizzeria_logo = path.join(__dirname, '/graphics/printer_logo.png');
    const www_image = path.join(__dirname, '/graphics/www.png');
    /*const order = {
        cart: {
            items: [
                {
                    name: "2. Šunková",
                    additionalItems: [
                        {
                            name: "Šunka"
                        },
                        {
                            name: "Rukola"
                        },
                    ],
                    quantity: 3,
                    price: 129,
                },
                {
                    name: "7. Gladiátor",
                    quantity: 1,
                    price: 139,
                    additionalItems: [
                        {
                            name: "Chorizo"
                        },
                    ],
                    note: "Vrátka jsou napůl rozbitá tak pozor při otevírání. Pavouk na verandě se jmenuje Frank, buďte na Franka hodní, hlídá rajčata."
                },
                {
                    name: "4. Hawaii",
                    quantity: 1,
                    price: 129,
                    note: "Sladká jako hruška"
                },
            ],
            totalAmount: 705,
            obaly: 50,
        },
        datePrinted: Date.now()
    };*/

    function translate(str){
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    }

    const timeStr = Date.now();
    const date = new Date(timeStr);
    const day = date.getDate();
    const month = date.getMonth()+1;
    const year = date.getFullYear();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const dateStr = day+"."+month+"."+year + " " + hours + ":" + minutes;


    let modify = [];
    order.cart.items.map( item => {
        modify.push({ text: item.quantity + "x", align:"RIGHT", width:0.1});
        modify.push({ text: "", align:"RIGHT", width:0.1});
        modify.push({ text: translate(item.name), align:"LEFT", width:0.6});
        modify.push({ text: item.price + ",-", align:"LEFT", width:0.2 });
    })

    const line = "______________________________________________"
    
    escpos.Image.load(pizzeria_logo, function(image){

        device.open( async function(){

            printer.align('ct')
                .image(image, 'd24')
                .then(() => {

                });

            order.cart.items.map( (item, index) => {

                if (index === 0){
                    printer
                        .text("")
                        .size(1,1)
                        .text('Pizza Paradise')
                        .size()
                        .align("lt")
                        .text("")
                        .tableCustom([
                            { text: "", align:"RIGHT", width:0.03},
                            { text: "Rozvoz", align:"LEFT", width:0.37},
                            { text: dateStr, align:"RIGHT", width:0.5 },
                            { text: "", align:"RIGHT", width:0.1},
                        ])
                        .text(line)
                        .text("")
                }

                printer.tableCustom([
                    { text: item.quantity + "x", align:"CENTER", width:0.1, style: "B"},
                    { text: "", align:"RIGHT", width:0.025},
                    { text: translate(item.name), align:"LEFT", width:0.675, style: "B"},
                    { text: item.price + ",-", align:"LEFT", width:0.2, style: "B" }
                ])

                if (item.additionalItems){
                    item.additionalItems.map( additionalItem => {
                        printer.
                        tableCustom([
                            { text: "", align:"RIGHT", width:0.125},
                            { text: "    + " + translate(additionalItem.name), align:"LEFT", width:0.675},
                            { text: "", align:"LEFT", width:0.2 }
                        ])
                    })
                }

                if (item.note){
                    printer.
                    tableCustom([
                        { text: "", align:"RIGHT", width:0.2},
                        { text: "Poznamka:", align:"LEFT", width:0.6},
                        { text: "", align:"LEFT", width:0.2 }
                    ])
                        .tableCustom([
                        { text: "", align:"RIGHT", width:0.2},
                        { text:  translate(item.note), align:"LEFT", width:0.6},
                        { text: "", align:"LEFT", width:0.2 }
                    ])
                }

                printer
                    .text("")

                if (index+1 === order.cart.items.length){

                    printer
                        .tableCustom([
                            { text: "", align:"RIGHT", width:0.03},
                            { text: "Obaly", align:"LEFT", width:0.77},
                            { text: order.cart.obaly + ",-", align:"LEFT", width:0.2 },

                        ])
                        .tableCustom([
                            { text: "", align:"RIGHT", width:0.03},
                            { text: "Celkem", align:"LEFT", width:0.77, style: "B" },
                            { text: order.cart.totalAmount + ",-", align:"LEFT", width:0.2, style: "B" },

                        ])
                        .text("")
                        .text(line)
                        .text("")
                        .align('ct')
                        .style('bu')
                        .text("Prejeme Vam dobrou chut!")
                        .style("")


                    escpos.Image.load(www_image, async function(www_image){
                        printer
                            .image(www_image, "d24")
                            .then(() => {
                                printer.
                                text("www.pizzaparadise.cz")
                                    .cut()
                                    .close()
                            })
                    });





                }
                

            })


        });

    });


});

app.get('/status', (req, res) => {
    console.log("status reached")
    res.send("OK");
});

http.listen(port, () => {
    console.log(`Printer: http://localhost:${port}`);
});