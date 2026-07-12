import os
from web3 import Web3, Account
from eth_account.messages import encode_defunct
import requests
import json

API_BASE = "http://localhost:3000/auth"
PRIVATE_KEY = os.getenv("PRIVATE_KEY", "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80")
PUBLIC_ADDRESS = os.getenv("PUBLIC_ADDRESS", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")

def main():
    # 1. Запросить nonce
    resp = requests.post(f"{API_BASE}/nonce", json={"publicAddress": PUBLIC_ADDRESS})
    resp.raise_for_status()
    print(resp.json())
    message = resp.json()["message"]
    print("Сообщение:", message, end='\n---\n')

    # 2. Подписать
    account = Account.from_key(PRIVATE_KEY)
    encoded_message = encode_defunct(text=message)
    # В web3.py сообщение должно быть в виде строки, подпись возвращается в hex
    signature = '0x' + account.sign_message(encoded_message)["signature"].hex()
    print("Подпись:", signature)

##    # 3. Отправить логин
##    login_resp = requests.post(f"{API_BASE}/login", json={
##        "publicAddress": PUBLIC_ADDRESS,
##        "signature": signature,
##    })
##    login_resp.raise_for_status()
##    tokens = login_resp.json()
##    print("Access Token:", tokens["accessToken"])
##    print("Refresh Token:", tokens["refreshToken"])

if __name__ == "__main__":
    main()
