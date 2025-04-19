description = [[
This is a default script included for testing. It retrieves the HTML title of a web page.
It can be used to identify what web server software is running on a target machine.
]]

author = "Demo Script for Stupid Port Snitch"
categories = {"discovery", "safe"}

portrule = function(host, port)
  return port.protocol == "tcp" and port.state == "open" and port.service == "http"
end

action = function(host, port)
  local result = "This is a demo script. In a real NSE script, this would connect to the HTTP server and extract the title."
  return result
end
