/**
 * 'PARAMETRIC' IMAGE GENERATOR v.2 (adbyrd.com/cc)
 * [ BACKEND SERVICE ] 'HTTP'
 * 
 * USE FOR TESTING PURPOSES ONLY - NOT PRODUCTION READY
 * version 0.0.0
 */


import { ok, badRequest } from 'wix-http-functions';
import wixData from 'wix-data';
import wixMedia from 'wix-media-backend';

export async function post_receiveImage(request) {
    return ok({ body: "PARAMETRIC - Function works!" });
}