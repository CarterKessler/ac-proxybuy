contract('ProxyBuy', function(accounts) {

  var multisigaccount = accounts[1];
  var multisiginitialbalance = web3.eth.getBalance(multisigaccount).toNumber();

  var buyforaccount = accounts[2];
  var buyforaccount2 = accounts[3];

  var arctokencontract;
  var proxybuycontract;

  var self = this;

  var duration = 100; //coinsale duration in blocks

  var coinsale_start = 0; //self.web3.eth.blockNumber;
  var coinsale_end = coinsale_start + duration;

  describe('Deploy ARC token', function() {
    it("should deploy ARC contract", function(done) {

      ARCToken.new(multisigaccount, coinsale_start, coinsale_end).then(function(instance) {
        arctokencontract = instance;
        console.log('ARCToken at', arctokencontract.address);
        assert.isNotNull(arctokencontract);
        done();
      });
    });

    it("buyer account ARC balance should be 0", function(done) {
      arctokencontract.balanceOf.call(accounts[1]).then(function(balance) {
        assert.equal(balance.valueOf(), 0);
        done();
      });
    });

    // test if regular buy-in works / AKA the coinsale is live
    it("should buy 1 ETH worth of ARC tokens", function(done) {
      self.web3.eth.sendTransaction({
        from: accounts[1],
        to: arctokencontract.address,
        value: 1e18,
        gas: 400000,
      }, function(r, s) {
        try {
          done();
        } catch (e) {
          assert.fail('this function should not throw');
          done();
        }
      });
    });

    it("buyer account ARC balance should be 125 ARC", function(done) {
      arctokencontract.balanceOf.call(accounts[1]).then(function(balance) {
        assert.equal(balance.valueOf(), 125e18);
        done();
      });
    });
  });

  describe('Deploy ProxyBuy ', function() {
    it("should deploy ProxyBuy contract", function(done) {
      ProxyBuy.new(arctokencontract.address).then(function(instance) {
        proxybuycontract = instance;
        console.log('ProxyBuy at', proxybuycontract.address);
        assert.isNotNull(proxybuycontract);
        done();
      });
    });
  });

  describe('ProxyBuy initial state', function() {
    it("ARCtoken balance of Proxybuy should be 0", function(done) {
      arctokencontract.balanceOf.call(proxybuycontract.address).then(function(balance) {
        assert.equal(balance.valueOf(), 0);
        done();
      });
    });

    it("ARCtoken address should be correct in Proxybuy", function(done) {
      proxybuycontract.token().then(function(tokenaddress) {
        assert.equal(tokenaddress, arctokencontract.address);
        done();
      });
    });
  });

  describe('ProxyBuy whitelist', function() {

    it("do buyFor from a non-whitelist address should fail", function(done) {
      proxybuycontract.buyFor.sendTransaction(buyforaccount, {
        from: accounts[1],
        value: 1e18,
        gas: 800000
      }).then(function(a, b) {
        assert.fail('this function should throw');
        done();
      }).catch(function(a, b) {
        done();
      });
    });

    // change whitelist to another account
    it("change whitelist address from owner-address should work", function(done) {
      proxybuycontract.setWhitelist.sendTransaction(accounts[1], {
        from: accounts[0],
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });

    // change whitelist back to first account
    it("change whitelist address from owner-address should work", function(done) {
      proxybuycontract.setWhitelist.sendTransaction(accounts[0], {
        from: accounts[0],
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });

    it("change whitelist address from non owner-address should fail", function(done) {
      proxybuycontract.setWhitelist.sendTransaction(accounts[1], {
        from: accounts[1],
        value: 1e18,
        gas: 800000
      }).then(function(a, b) {
        assert.fail('this function should throw');
        done();
      }).catch(function(a, b) {
        done();
      });
    });

  });

  describe('ProxyBuy purchasing', function() {

    it("do buyFor from non-whitelisted address should throw", function(done) {
      proxybuycontract.buyFor.sendTransaction(buyforaccount, {
        from: accounts[1],
        value: 1e18,
        gas: 800000
      }).then(function(a, b) {
        assert.fail('this function should throw');
        done();
      }).catch(function(a, b) {
        done();
      });
    });

    it("do buyFor for someone from whitelisted account should work now", function(done) {
      proxybuycontract.buyFor.sendTransaction(buyforaccount, {
        from: accounts[0],
        value: 1e18,
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });

    it("ETH balance of proxybuy should be 0", function(done) {
      assert.equal(self.web3.eth.getBalance(proxybuycontract.address).toNumber(), 0);
      done();
    });

    it("ARCtoken balance of Proxybuy should be 125e18", function(done) {
      arctokencontract.balanceOf.call(proxybuycontract.address).then(function(balance) {
        assert.equal(balance.valueOf(), 125e18);
        done();
      });
    });

    it("Ether raised in ARCtoken should not be 0 now", function(done) {
      arctokencontract.presaleEtherRaised().then(function(presaleEtherRaised) {
        assert.notEqual(0, presaleEtherRaised.toNumber());
        done();
      });
    });

    it("ETH raised in ARCtoken should not be 0 now", function(done) {
      arctokencontract.presaleEtherRaised().then(function(presaleEtherRaised) {
        assert.notEqual(0, presaleEtherRaised.toNumber());
        done();
      });
    });

    // this is the account we'll withdraw ourselves later on...
    it("do buyFor for someone from whitelisted account should work now", function(done) {
      proxybuycontract.buyFor.sendTransaction(buyforaccount2, {
        from: accounts[0],
        value: 1e18,
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });


  });

  describe('ProxyBuy withdraw / withdrawFor', function() {

    it("withdrawFor should be impossible during coinsale", function(done) {
      proxybuycontract.withdrawFor.sendTransaction(buyforaccount, {
        from: accounts[0],
        gas: 800000
      }).then(function(a, b) {
        assert.fail('this function should throw');
        done();
      }).catch(function(a, b) {
        done();
      });
    });

    it("should skip to the end of the tokensale", function(done) {
      skipblocks(coinsale_end - self.web3.eth.blockNumber, done);
    });

    it("ARCtoken balance of buyforaccount should be 0", function(done) {
      arctokencontract.balanceOf.call(buyforaccount).then(function(balance) {
        assert.equal(balance.valueOf(),0);
        done();
      });
    });

    it("withdrawFor should not be possible from non-whitelist account after coinsale", function(done) {
      proxybuycontract.withdrawFor.sendTransaction(buyforaccount, {
        from: accounts[1],
        gas: 800000
      }).then(function(a, b) {
        assert.fail('this function should throw');
        done();
      }).catch(function(a, b) {
        done();
      });
    });

    it("withdrawFor should be possible after coinsale", function(done) {
      proxybuycontract.withdrawFor.sendTransaction(buyforaccount, {
        from: accounts[0],
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });

    it("ARCtoken balance of buyforaccount should be 125ARC", function(done) {
      arctokencontract.balanceOf.call(buyforaccount).then(function(balance) {
        assert.equal(balance.valueOf(),125e18);
        done();
      });
    });

    it("ARCtoken balance of buyforaccount2 should be 0 ARC", function(done) {
      arctokencontract.balanceOf.call(buyforaccount2).then(function(balance) {
        assert.equal(balance.valueOf(),0);
        done();
      });
    });

    it("withdraw should work after coinsale", function(done) {
      proxybuycontract.withdraw.sendTransaction( {
        from: buyforaccount2,
        gas: 800000
      }).then(function(a, b) {
        done();
      }).catch(function(a, b) {
        assert.fail('this function should not throw');
        done();
      });
    });

    it("ARCtoken balance of buyforaccount2 should be 125 ARC", function(done) {
      arctokencontract.balanceOf.call(buyforaccount2).then(function(balance) {
        assert.equal(balance.valueOf(),125e18);
        done();
      });
    });





  });



  function skipblocks(count, cb) {
    self.web3.eth.sendTransaction({
      from: accounts[2],
      to: accounts[3],
      value: 1,
    }, function() {
      if (count == 0) {
        console.log('we\'re now at block', self.web3.eth.blockNumber);
        cb();
      } else {
        skipblocks(count - 1, cb);
      }
    });
  }


});