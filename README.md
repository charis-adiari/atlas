# Atlas - Collaborative Whiteboard & Markdown

A collaborative knowledge workspace that combines the flexibility of an infinite whiteboard with the structure and simplicity of Markdown notes.

## Vision

The goal is to build a workspace inspired by Excalidraw and Obsidian where knowledge can be expressed in more than one way.

A user should be able to:

* Write a Markdown note and connect it to a diagram
* Create a diagram and link its elements to notes
* Navigate seamlessly between visual and written information
* Collaborate with others in a shared workspace

Rather than treating documents and drawings as separate tools, the system aims to bring them together into a connected knowledge environment.

## Features

The system is intended to support:

* An interactive, collaborative whiteboard
* Markdown-based note taking
* Links between drawings and notes
* Bidirectional relationships between visual and written content
* Connected knowledge and workspace navigation
* Real-time collaboration capabilities
* A unified experience for visual thinking and documentation

## Architecture

This project is structured as a monorepo containing separate frontend and backend applications.

```text
.
├── atlas-ui/          # Frontend application
│
├── atlas-api/         # Backend application
│
├── .wiki/             # Documentation
│
└── README.md
```

The frontend and backend are maintained independently within the same repository while working together as part of the overall system.

## Tech Stack

The frontend will be built using React. Additional React tooling and frameworks: **To be decided**. The backend will be built using Java Quarkus.