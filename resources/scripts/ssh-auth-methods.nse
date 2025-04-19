description = [[
This is a default script included for testing. It checks what authentication methods an SSH server supports.
]]

author = "Demo Script for Stupid Port Snitch"
categories = {"discovery", "safe"}

portrule = function(host, port)
  return port.protocol == "tcp" and port.state == "open" and port.service == "ssh"
end

action = function(host, port)
  local result = "This is a demo script. In a real NSE script, this would check what authentication methods the SSH server offers (password, publickey, etc)."
  return result
end
