# -*- mode: ruby -*-
# vi: set ft=ruby :

def which(cmd)
  exts = ENV['PATHEXT'] ? ENV['PATHEXT'].split(';') : ['']
  ENV['PATH'].split(File::PATH_SEPARATOR).each do |path|
    exts.each { |ext|
      exe = File.join(path, "#{cmd}#{ext}")
      return exe if File.executable?(exe) && !File.directory?(exe)
    }
  end
  return nil
end

if Vagrant::Util::Platform.windows? && which('cygpath') != nil
  ENV["VAGRANT_DETECTED_OS"] = ENV["VAGRANT_DETECTED_OS"].to_s + " cygwin"
end

$script = <<SCRIPT
apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 7F0CEB10
echo "deb http://repo.mongodb.org/apt/ubuntu trusty/mongodb-org/3.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-3.0.list
apt-get update -y
apt-get install -y build-essential g++ mongodb-org libkrb5-dev

if hash pip 2>/dev/null; then
    pip install -U pip
else
    curl -sSL https://bootstrap.pypa.io/get-pip.py | python
fi

curl --silent --location https://deb.nodesource.com/setup_4.x | bash -
apt-get install --yes nodejs

SCRIPT

# Vagrantfile API/syntax version. Don't touch unless you know what you're doing!
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|

  config.vm.box = "ubuntu/trusty64"

  config.vm.hostname = "swagger-dev"

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  config.vm.network "forwarded_port", guest: 8080, host: 8080
  config.vm.network "forwarded_port", guest: 27017, host: 37017

  config.vm.synced_folder ".", "/home/vagrant/swagger", type: "rsync", rsync__exclude: [".venv/", "node_modules/", "coverage/"]

  config.vm.provision "docker" do |d|
    # pull down base images
    d.pull_images "ubuntu:14.04"
    d.pull_images "mongo:3.1"
    d.pull_images "node:0.10"
    d.pull_images "node:0.12"
    d.pull_images "node:4"
  end

  # make it so your git will continue to work even within the VM
  config.vm.provision "file", source: "~/.gitconfig", destination: ".gitconfig"
  config.vm.provision "file", source: "~/.ssh/id_rsa", destination: ".ssh/id_rsa"
  config.vm.provision "file", source: "~/.ssh/id_rsa.pub", destination: ".ssh/id_rsa.pub"

  config.vm.provision "shell", inline: $script
  config.vm.provision "shell", path: "./contrib/build.sh"

  # Provider-specific configuration so you can fine-tune various
  # backing providers for Vagrant. These expose provider-specific options.
  config.vm.provider "virtualbox" do |vb|
    # Don't boot with headless mode
    # vb.gui = true

    # Specify number of CPUs
    # vb.cpus = 2

    # Specify amount of memory
    vb.memory = 1024

    # resolves intermittent connectivity within VM
    vb.customize ["modifyvm", :id, "--natdnshostresolver1", "on"]
    vb.customize ["modifyvm", :id, "--natdnsproxy1", "on"]

    # Customize the max CPU utillization on physical host (max 50%)
    # vb.customize ["modifyvm", :id, "--cpuexecutioncap", "50"]
  end

end
