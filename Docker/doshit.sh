#!/bin/sh

# Paths for various files
verdict_path="./contest/verdict.txt"
output_path="./sandbox/output.txt"
compare_path="./contest/compare.txt"
expected_output_path="./contest/expected_output.txt"

# Clear verdict and compare files
truncate -s 0 $verdict_path $compare_path

# Create a sandbox directory and copy source code and input
mkdir sandbox
cp ./contest/a.cpp ./sandbox/a.cpp
cp ./contest/input.txt ./sandbox/input.txt

# Set a random password for root
SECRET_PASS=$(tr -dc '[:alnum:]' < /dev/urandom | head -c 69)
echo "root:$SECRET_PASS" | chpasswd

# Set permissions for the contest directory
chown root ./contest
chmod 700 -R ./contest

# Create a user for the sandbox environment
adduser -D -h ./sandbox sandbox_boi

# Compile the C++ code
g++ -o ./sandbox/a.out ./sandbox/a.cpp
stat=$?

# Set permissions for the sandbox directory
chown -R sandbox_boi:sandbox_boi ./sandbox
chmod 700 -R ./sandbox

# Handle compilation errors
if [ $stat -ne 0 ]; then
    echo "Compilation Error" >> $verdict_path
    chown -R sandbox_boi:sandbox_boi ./contest
    exit 1
fi

# Reset root password for safety
SECRET_PASS=$(tr -dc '[:alnum:]' < /dev/urandom | head -c 69)

# Run the compiled program with a timeout of 2 seconds
(
    timeout 2s su - sandbox_boi -c "./a.out < input.txt > output.txt"
)

exit_status=$?

# Change ownership back to sandbox_boi for the contest directory
chown -R sandbox_boi:sandbox_boi ./contest
cp ./sandbox/output.txt ./contest/output.txt

# Handle different execution results
if [ $exit_status -eq 124 ]; then
    echo "Time Limit Exceeded" >> $verdict_path

elif [ $exit_status -ne 0 ]; then
    echo "Runtime Error" >> $verdict_path

else
    # Ensure output.txt exists
    if [ ! -f $output_path ]; then
        touch $output_path
    fi

    # Compare the output with the expected output
    diff --brief $output_path $expected_output_path > $compare_path
    
    if [ -s $compare_path ]; then
        echo "Wrong Answer" >> $verdict_path
    else
        echo "Accepted" >> $verdict_path
    fi
fi
