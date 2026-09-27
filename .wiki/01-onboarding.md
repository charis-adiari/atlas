# Onboarding Guide

Welcome! This monorepo contains two main projects:

- **`atlas-ui/`** - a React NextJS frontend
- **`atlas-api/`** - a Java Quarkus backend

Each subfolder has its own README with the exact commands to run that project. This guide covers the tools you need installed on your machine first before those instructions will work.

## Table of Contents
1. [Tools for the UI](#tools-for-the-ui)
    - [Node](#node)
1. [Tools for the API](#tools-for-the-api)
    - [Java](#java)
    - [Maven](#maven)
1. [Tools for the Database](#tools-for-the-database)
    - [WSL (Windows only)](#wsl)
    - [Rancher Desktop](#rancher-desktop)
1. [Recommended IDE / editor](#recommended-ide--editor)
1. [Next Steps](#next-steps)

---

## Tools for the UI

### Node

The UI project is a managed with npm. You will need Node.js (which bundles npm) installed first.

- [Download Node.js](https://nodejs.org/en/download)
- Verify install:
  ```
  node --version
  npm --version
  ```

Once Node is installed, head to the [UI README](../atlas-ui/README.md) for project-specific setup (installing dependencies, running the dev server, etc.).

## Tools for the API

### Java

The API project is built with Quarkus, which requires a JDK.

- Follow [this guide](https://www.freecodecamp.org/news/how-to-set-up-java-development-environment-a-comprehensive-guide) to download a JDK and set up Java environment variable.
  - Skip to [this point](https://www.freecodecamp.org/news/how-to-set-up-java-development-environment-a-comprehensive-guide/#heading-how-to-set-the-javahome-environment-variable) if you've already installed a JDK

**Troubleshooting**:

If you've set the environment variables following the guide but nothing shows up in the terminal when you try to verify them, restart your PC.

### Maven

The Quarkus project is built and run via Maven.

- [Set up Maven](https://www.tutorialspoint.com/maven/maven_environment_setup.htm)

**Troubleshooting**:

If you've set the environment variables but nothing shows up in the terminal when you try to verify them, restart your PC.


## Tools for the Database

The database runs as a container rather than being installed locally, so you'll need a container runtime.

### WSL

If you're on Windows, install WSL first; Rancher Desktop relies on it.

- [Install WSL](https://learn.microsoft.com/en-us/windows/wsl/install#install-wsl-command)
  - When [setting up your username and password](https://learn.microsoft.com/en-us/windows/wsl/setup/environment#set-up-your-linux-username-and-password), make sure you choose a password you'll remember
  - Make sure you update your distribution with these commands:

  ```
  sudo apt update && sudo apt upgrade
  ```

**Troubleshooting**:

- When you install wsl, you might be directed to reboot your PC for changes to take effect. If prompted, do it. After rebooting, open Windows Powershell and enter the command `wsl` to get back into wsl.
- After installing, you might be informed that no distributions have been installed. In that case, install Ubuntu:

```
wsl.exe --install -d [Distro]
```

If you prefer another distribution, you can see a list of available Linux distributions available for download through the online store, using: 

```
wsl.exe --list --online
```

**N.B.**: Your installation is **not successful** until you have set your username and password.

### Rancher Desktop

Using Docker through a GUI is more convenient. Rancher Desktop is recommended.

> Docker Desktop also works fine as an alternative if that's what you already have set up, but it isn't covered by this guide.

- [Set up Rancher Desktop](https://adamtheautomator.com/docker-rancher/)
  - Step no 7 of the guide says to leave the default settings as-is:
  ![Step 7 of setting up Rancher Desktop](./assets/Install%20Rancher%20Desktop%20step%207.png)

    You can do that to [run the tests recommended by the guide](https://adamtheautomator.com/docker-rancher/#using-rancher-desktop-building-images). But this project uses the standard docker cli. After you have run the tests, access the settings from File > Preferences (or `Ctrl+Comma`) and change them to use the dockerd runtime:

  ![Rancher Desktop settings panel with dockerd runtime selected](./assets/Rancher%20Desktop%20dockerd%20runtime.png)

- Verify install: `docker --version`


Once installed, check the [API README](../atlas-api/README.md) for the command to spin up the database container.

## Recommended IDE / Editor

While not required, most contributors use:

- Visual Studio Code with the ESLint/Prettier extensions for the frontend
- IntelliJ, the free Community Edition is fine
- pagAdmin4 for browsing and querying the database directly
  - As of writing, pgAdmin4 v18 has a known bug that causes this error: `exception: access violation writing 0x0000000000000000` when you try to connect to a database. For now, the fix is to use pgAdmin4 v17 instead

## Next Steps

Once Git, Node.js, Java, Maven, and your container runtime are installed and verified:

1. For frontend setup and run instructions → see [UI README](../atlas-ui/README.md)
1. For backend setup and run instructions → see [API README](../atlas-api/README.md)