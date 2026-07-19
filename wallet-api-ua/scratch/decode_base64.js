const str = "MIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgpKy2VvPzDaf5x6obkw+MWGo4+CE7xSmVIzwKthZGUMyhRANCAAROkEsgDMXFARFYtXilmMW0dQW0aKSNo4D3YJFlZHSEkVvQwlDI0lAGfCNbV5Ee1yoGjTSUaa9O1Z/9lh+xQ6vO";
const buffer = Buffer.from(str, 'base64');
console.log("Length:", buffer.length);
console.log("Hex:", buffer.toString('hex'));
console.log("UTF8:", buffer.toString('utf8'));
