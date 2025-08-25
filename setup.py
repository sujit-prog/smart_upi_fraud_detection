#!/usr/bin/env python3
"""
Complete setup script for UPI Fraud Detection System
This script sets up the entire project structure and initializes everything
"""

import os
import sys
import subprocess
from pathlib import Path
import platform

def print_header(title):
    print("=" * 60)
    print(f" {title}")
    print("=" * 60)

def print_step(step, description):
    print(f"\n🔄 Step {step}: {description}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def run_command(command, description="", check=True):
    """Run a command and return success status"""
    try:
        if description:
            print(f"   Running: {description}")
        
        result = subprocess.run(
            command,
            shell=True,
            check=check,
            capture_output=True,
            text=True
        )
        
        if result.returncode == 0:
            print_success(f"Command completed: {command}")
            return True
        else:
            print_error(f"Command failed: {command}")
            if result.stderr:
                print(f"Error: {result.stderr}")
            return False
            
    except Exception as e:
        print_error(f"Exception running command: {e}")
        return False

def create_directory_structure():
    """Create the complete project directory structure"""
    print_step(1, "Creating directory structure")
    
    directories = [
        "backend/app/api/routes",
        "backend/app/core", 
        "backend/app/services",
        "backend/app/schemas",
        "backend/app/models",
        "models/ensemble",
        "data/raw",
        "data/processed", 
        "data/test",
        "notebooks",
        "scripts",
        "tests",
        "docs",
        "logs",
        "frontend"
    ]
    
    for directory in directories:
        try:
            Path(directory).mkdir(parents=True, exist_ok=True)
            print(f"   📁 Created: {directory}")
        except Exception as e:
            print_error(f"Failed to create {directory}: {e}")
            return False
    
    print_success("Directory structure created")
    return True

def create_init_files():
    """Create all __init__.py files"""
    print_step(2, "Creating __init__.py files")
    
    init_files = [
        "backend/app/__init__.py",
        "backend/app/api/__init__.py",
        "backend/app/api/routes/__init__.py",
        "backend/app/core/__init__.py",
        "backend/app/services/__init__.py", 
        "backend/app/schemas/__init__.py",
        "backend/app/models/__init__.py",
        "tests/__init__.py"
    ]
    
    for init_file in init_files:
        try:
            Path(init_file).touch()
            print(f"   📄 Created: {init_file}")
        except Exception as e:
            print_error(f"Failed to create {init_file}: {e}")
            return False