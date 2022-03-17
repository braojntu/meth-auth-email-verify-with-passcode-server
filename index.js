const express = require('express');
const app = express();
const PORT = 5000

app.get('/',(req,res)=>{
    res.send('<h1>MERN Auth Server Default Route</h1>')
})

app.listen(PORT,()=>{
    console.log("Node Express Server Running on Port: "+PORT)
})