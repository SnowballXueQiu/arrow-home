# /// script
# requires-python = ">=3.11"
# dependencies = ["bcrypt"]
# ///

import bcrypt
import getpass

pwd = getpass.getpass("请输入密码: ")
hashed = bcrypt.hashpw(pwd.encode(), bcrypt.gensalt()).decode()

# $$ for use in .env / compose.yaml
escaped = hashed.replace("$", "$$")

print(f"\nbcrypt hash:\n{hashed}")
print(f"\n.env / compose.yaml 用 ($ → $$):\n{escaped}")
