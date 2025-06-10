# Sample Hardhat Project

This project demonstrates a basic Hardhat use case. It comes with a sample contract, a test for that contract, and a Hardhat Ignition module that deploys that contract.

Try running some of the following tasks:

```shell
npx hardhat help
npx hardhat test
REPORT_GAS=true npx hardhat test
npx hardhat node
npx hardhat ignition deploy ./ignition/modules/Lock.js
```



# ① 克隆项目、安装依赖
git clone https://github.com/yourname/htlc-demo.git
cd htlc-demo && npm i

# ② 填 .env：RPC、私钥、双方地址
cp .env.example .env   # 按上文填

# ③ 编译
npx hardhat compile

# ④ 在两条链分别部署
npx hardhat run scripts/deploy.js --network zircuit
npx hardhat run scripts/deploy.js --network baseTest

# ⑤ A 生成 swap
node scripts/createSwap.js --network zircuit

# ⑥ B 对锁
# 把上一步输出的 id/hashLock/preimage 填进 .env 后：
node scripts/participateSwap.js --network baseTest

# ⑦ A 领取 (自动泄露 S)
node scripts/claim.js --network baseTest

# ⑧ B “看门人”监听 & 自动领取
node watcher/relay.js
