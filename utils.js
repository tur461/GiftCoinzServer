function calcAddressFromKey(user) {
    let pubk = user.public,
        prvk = user.private;
    
    return pubk;
}

module.exports = {
    calcAddressFromKey,
}