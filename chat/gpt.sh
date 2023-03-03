#!/bin/sh

echo '$0: Script Name: '$0
echo '$1: Keyword: '$1
echo '$2: Temperature: '$2

echo "\nInput": $1
echo "\nOutput:" 

curl=`cat <<EOS
curl https://api.openai.com/v1/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer " \
  -d '{
  "model": "text-davinci-003",
  "prompt": "$1",
  "max_tokens": 4000,
  "temperature": $2

}' \
--insecure
EOS`

eval ${curl}
