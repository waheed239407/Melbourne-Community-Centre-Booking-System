'use strict'
const test=require('node:test')
const assert=require('node:assert/strict')
const {generateCode,hashCode,codeMatches}=require('../lib/verification')
const SECRET='test-secret-with-sufficient-length-32-characters'
const EMAIL='Sample@Example.com'

test('V01 verification code has exactly six numeric digits',()=>assert.match(generateCode(),/^\d{6}$/))
test('V02 verification code hash is SHA-256 hex',()=>assert.match(hashCode(EMAIL,'012345',SECRET),/^[0-9a-f]{64}$/))
test('V03 correct verification code matches',()=>assert.equal(codeMatches(EMAIL,'012345',hashCode(EMAIL,'012345',SECRET),SECRET),true))
test('V04 wrong verification code is rejected',()=>assert.equal(codeMatches(EMAIL,'999999',hashCode(EMAIL,'012345',SECRET),SECRET),false))
test('V05 malformed verification codes are rejected',()=>{for(const v of ['12345','1234567','ABCDEF',null,''])assert.equal(codeMatches(EMAIL,v,hashCode(EMAIL,'012345',SECRET),SECRET),false)})
test('V06 verification hashes are tied to account email',()=>assert.equal(codeMatches('Other@example.com','012345',hashCode(EMAIL,'012345',SECRET),SECRET),false))
test('V07 case insensitive email hashing',()=>assert.equal(hashCode('sample@example.com','012345',SECRET),hashCode(EMAIL,'012345',SECRET)))
