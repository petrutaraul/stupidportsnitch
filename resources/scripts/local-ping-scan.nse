-- filepath: /Users/raul/Developer/Projects/nmap-ui/resources/scripts/local-ping-scan.nse
local nmap = require "nmap"
local stdnse = require "stdnse"
local ipOps = require "ipOps"

description = [[
Performs a simple ping sweep on the local network to identify live hosts.
]]

author = "Raul Carlos Petru Petruța"
license = "Same as Nmap--See https://nmap.org/book/man-legal.html"
categories = {"discovery", "safe"}

-- This tells Nmap when to run the script (always in this case)
-- It's required for every NSE script
hostrule = function(host)
  return true
end

-- Main logic
action = function(host)
  local status, result = nmap.execute("ping -c 1 " .. host.ip)
  if status == true and result:match("1 received") then
    return "Host " .. host.ip .. " is up (ping responded)."
  else
    return "Host " .. host.ip .. " did not respond to ping."
  end
end