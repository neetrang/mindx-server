import {Redis} from 'ioredis';
require('dotenv').config();

//redis client configuration

const redisClient = ()=>{
    if(process.env.REDIS_URL){
        console.log('Redis connected');
        return process.env.REDIS_URL;
    }
    throw new Error('Redisconnection failed');
}
export const redis=new Redis(redisClient()); 