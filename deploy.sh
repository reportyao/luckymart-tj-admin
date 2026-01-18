#!/usr/bin/expect -f
set timeout 60
spawn scp -o StrictHostKeyChecking=no dist.tar.gz root@47.82.78.182:/tmp/
expect "password:"
send "Lingjiu123@\r"
expect eof
spawn ssh -o StrictHostKeyChecking=no root@47.82.78.182 "cd /var/www/test.tezbarakat.com/admin/ && rm -rf * && tar xzf /tmp/dist.tar.gz --strip-components=1 && chown -R www-data:www-data . && chmod -R 755 . && ls -la assets/ | tail -3"
expect "password:"
send "Lingjiu123@\r"
expect eof
