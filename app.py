from flask import Flask, render_template, jsonify, request
from simulation.engine import SimulationEngine
import os

app = Flask(__name__, static_folder='static', template_folder='templates')

# Global simulation engine instance
engine = SimulationEngine({
    'rows': 10,
    'cols': 10,
    'characters': 2,
    'food': 6,
    'trees': 3,
    'daily_food_spawn': 2
})

@app.route('/')
def index():
    """Renders the main scientific laboratory & ecosystem simulation UI."""
    return render_template('index.html')

@app.route('/api/state', methods=['GET'])
def get_state():
    """Returns the complete current simulation state."""
    try:
        state = engine.get_state()
        return jsonify({
            'status': 'success',
            'data': state
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/start', methods=['POST'])
def start_simulation():
    """Sets simulation status to active."""
    engine.status = "RUNNING"
    return jsonify({
        'status': 'success',
        'message': 'Simulation started',
        'data': engine.get_state()
    })

@app.route('/api/next-day', methods=['POST'])
def next_day():
    """
    Executes one complete simulation day.
    Returns the updated world state and step-by-step events for visual animation.
    """
    try:
        result = engine.simulate_day()
        return jsonify({
            'status': 'success',
            'day': result['completed_day'],
            'next_day': result['next_day'],
            'events': result['events'],
            'telemetry': result['telemetry'],
            'world': result['state']['world'],
            'state': result['state']
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/reset', methods=['POST'])
def reset_world():
    """Resets the world and respawns entities with optional custom parameters."""
    try:
        data = request.get_json(silent=True) or {}
        custom_config = {}
        if 'rows' in data and data['rows']:
            custom_config['rows'] = int(data['rows'])
        if 'cols' in data and data['cols']:
            custom_config['cols'] = int(data['cols'])
        if 'characters' in data and data['characters']:
            custom_config['characters'] = int(data['characters'])
        if 'food' in data and data['food']:
            custom_config['food'] = int(data['food'])
        if 'trees' in data and data['trees']:
            custom_config['trees'] = int(data['trees'])
        if 'daily_food_spawn' in data and data['daily_food_spawn'] is not None:
            custom_config['daily_food_spawn'] = int(data['daily_food_spawn'])

        engine.reset(custom_config)
        return jsonify({
            'status': 'success',
            'message': 'World reset successfully',
            'data': engine.get_state()
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/api/config', methods=['POST'])
def update_config():
    """Updates runtime configuration settings."""
    try:
        data = request.get_json(silent=True) or {}
        for k, v in data.items():
            if k in engine.config:
                engine.config[k] = v
        return jsonify({
            'status': 'success',
            'config': engine.config
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Listen on localhost:5000
    app.run(host='127.0.0.1', port=5000, debug=True)
