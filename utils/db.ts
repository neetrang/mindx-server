require('dotenv').config();
import mongoose from "mongoose";
const dbUrl: string =process.env.DB_URI || '';
const connectDB = async ()=>{
    try {
        await mongoose.connect(dbUrl).then((data:any)=>{
            console.log(`Database connected with ${data.connection.host}`)
        })
    } catch (err:any) {
    console.error(`Error connecting to the database: ${err.message}`);
        setTimeout(connectDB, 5000);
    }
}
export default connectDB;